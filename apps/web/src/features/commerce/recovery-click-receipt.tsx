"use client";
import {useEffect} from "react";
export function recoveryDeliveryId(fragment:string):string|null {
  const match=/^#recovery=([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.exec(fragment);
  return match?.[1]??null;
}
/** A reminder receipt has no UI or commerce side effects. Its opaque ID stays out of referrers. */
export function RecoveryClickReceipt({orderId}:{orderId:string}) {
  useEffect(()=>{
    const deliveryId=recoveryDeliveryId(window.location.hash);
    if(!deliveryId)return;
    window.history.replaceState(window.history.state,"",window.location.pathname+window.location.search);
    const controller=new AbortController();
    void fetch("/api/commerce/recovery/receipt",{method:"POST",credentials:"same-origin",cache:"no-store",signal:controller.signal,
      headers:{"content-type":"application/json"},body:JSON.stringify({version:1,orderId,deliveryId})}).catch(()=>{});
    return()=>controller.abort();
  },[orderId]);
  return null;
}
