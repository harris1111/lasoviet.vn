import {and,desc,eq,inArray,isNull,notExists,or} from "drizzle-orm";
import {RecoveryReceiptCommandV1Schema,RecoveryReceiptViewV1Schema,type CurrentActor,type RecoveryReceiptCommandV1,WalletTopUpCatalogV1,findLaProduct} from "@lasoviet/contracts";
import {authUsers,birthProfiles,commerceOrders,consents,deletionRequests,lockFreeAiCoordination,lockRecoveryCaptureCoordination,notificationDeliveries,notificationPreferences,recoveryClickReceipts,walletPurchaseIntents,walletTopUpContinuations,ziweiCharts,ziweiChartVersions,type Database} from "@lasoviet/database";
import {fingerprintEmail} from "./notification-preference.js";

export class RecoveryReceiptError extends Error {
  constructor(readonly code:"RECOVERY_DISABLED"|"RECOVERY_NOT_FOUND") {super(code);}
}
/** Records only an authorized click, never payment authority or revenue. */
export function createRecoveryClickReceiptService(options:{database:Database;mode?:"disabled"|"capture";tokenSecret:string;orderTtlSeconds:number;now?:()=>Date}) {
  const {database}=options,clock=options.now??(()=>new Date());
  if(!Number.isSafeInteger(options.orderTtlSeconds)||options.orderTtlSeconds<1)throw Error("RECOVERY_TTL_INVALID");
  const absent=()=>{throw new RecoveryReceiptError("RECOVERY_NOT_FOUND");};
  return {
    async record(actor:CurrentActor,input:RecoveryReceiptCommandV1) {
      if(options.mode!=="capture")throw new RecoveryReceiptError("RECOVERY_DISABLED");
      const command=RecoveryReceiptCommandV1Schema.parse(input);
      if(actor.kind!=="account")return absent();
      return database.transaction(async tx=>{
        await lockFreeAiCoordination(tx);await lockRecoveryCaptureCoordination(tx);
        const now=clock();
        const [user]=await tx.select().from(authUsers).where(and(eq(authUsers.id,actor.userId),eq(authUsers.emailVerified,true),eq(authUsers.isAnonymous,false),
          notExists(tx.select({id:deletionRequests.id}).from(deletionRequests).where(and(eq(deletionRequests.userId,actor.userId),inArray(deletionRequests.status,["requested","purged"])))))).limit(1);
        if(!user)return absent();
        const [consent]=await tx.select().from(consents).where(and(eq(consents.userId,user.id),eq(consents.purpose,"offers"))).orderBy(desc(consents.grantedAt),desc(consents.id)).limit(1);
        const [delivery]=await tx.select().from(notificationDeliveries).where(and(eq(notificationDeliveries.id,command.deliveryId),eq(notificationDeliveries.kind,"recovery_pending_topup"))).limit(1);
        if(!consent||consent.revokedAt||consent.grantedAt>now||!delivery)return absent();
        const preferences=await tx.select().from(notificationPreferences).where(or(eq(notificationPreferences.userId,user.id),eq(notificationPreferences.emailFingerprint,fingerprintEmail(user.email,options.tokenSecret))));
        if(preferences.some(p=>p.unsubscribedAll||!p.nurtureEmailsAllowed)||delivery.recipientFingerprint!==fingerprintEmail(user.email,options.tokenSecret))return absent();
        const payload=delivery.requestPayload;
        if(payload.userId!==user.id||payload.orderId!==command.orderId||delivery.idempotencyKey!==`recovery-pending-topup:${command.orderId}`||
          !["captured","sent"].includes(delivery.status)||delivery.createdAt>now||
          (delivery.status==="sent"&&(!delivery.sentAt||delivery.sentAt>now)))return absent();
        const [order]=await tx.select().from(commerceOrders).where(and(eq(commerceOrders.id,command.orderId),eq(commerceOrders.ownerId,user.id))).for("share",{skipLocked:true});
        if(!order||order.kind!=="wallet_topup")return absent();
        const [continuation]=await tx.select().from(walletTopUpContinuations).where(eq(walletTopUpContinuations.orderId,order.id)).for("share",{skipLocked:true});
        if(!continuation||continuation.ownerId!==user.id||continuation.purchaseIntentId!==payload.intentId)return absent();
        const [intent]=await tx.select().from(walletPurchaseIntents).where(eq(walletPurchaseIntents.id,continuation.purchaseIntentId)).for("share",{skipLocked:true});
        if(!intent||intent.ownerId!==user.id||intent.chartId!==payload.chartId||intent.chartVersionId!==payload.chartVersionId||intent.locale!==payload.locale||intent.priceLa!==payload.amountLa)return absent();
        const product=findLaProduct(intent.sku),pack=WalletTopUpCatalogV1.find(p=>p.id===order.sku);
        if(!product||product.availability!=="active"||intent.priceLa!==product.priceLa||!product.locales.includes(intent.locale as "vi"|"en")||
          !pack||order.amount!==pack.vndAmount||order.currency!=="VND"||payload.topUpVnd!==order.amount||order.locale!==intent.locale)return absent();
        const [chart]=await tx.select({profile:birthProfiles}).from(ziweiCharts).innerJoin(birthProfiles,eq(birthProfiles.id,ziweiCharts.profileId))
          .where(and(eq(ziweiCharts.id,intent.chartId),eq(birthProfiles.userId,user.id),isNull(birthProfiles.deletedAt))).limit(1);
        const [version]=await tx.select({id:ziweiChartVersions.id}).from(ziweiChartVersions).where(eq(ziweiChartVersions.chartId,intent.chartId)).orderBy(desc(ziweiChartVersions.createdAt),desc(ziweiChartVersions.id)).limit(1);
        if(!chart||version?.id!==intent.chartVersionId)return absent();
        const [existing]=await tx.select().from(recoveryClickReceipts).where(eq(recoveryClickReceipts.orderId,order.id)).limit(1);
        if(existing) {
          if(existing.deliveryId!==delivery.id||existing.ownerId!==user.id||existing.intentId!==intent.id||existing.chartVersionId!==intent.chartVersionId)return absent();
          // Replay retains the original time and classification, even after payment/status changes.
          return RecoveryReceiptViewV1Schema.parse({version:1,orderId:order.id,source:"reminder",classification:existing.classification});
        }
        if(order.status!=="pending"||order.paidAt||order.createdAt>now||order.createdAt.getTime()+options.orderTtlSeconds*1000<=now.getTime()||
          (order.creditExpiresAt&&order.creditExpiresAt<=now)||continuation.status!=="pending"||intent.status!=="pending"||
          intent.periodKey!=="lifetime"||intent.stateVersion!==continuation.intentStateVersion||intent.stateVersion!==payload.intentStateVersion||intent.priceLa!==continuation.confirmedPriceLa)return absent();
        const classification=delivery.status==="captured"?"captured_click":"clicked";
        await tx.insert(recoveryClickReceipts).values({ownerId:user.id,deliveryId:delivery.id,orderId:order.id,intentId:intent.id,
          chartId:intent.chartId,chartVersionId:intent.chartVersionId,classification,clickedAt:now});
        return RecoveryReceiptViewV1Schema.parse({version:1,orderId:order.id,source:"reminder",classification});
      });
    },
  };
}
