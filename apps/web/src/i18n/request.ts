import {getRequestConfig} from "next-intl/server";
import enCommon from "../../messages/en/common.json";
import enNavigation from "../../messages/en/navigation.json";
import enAuth from "../../messages/en/auth.json";
import enProfile from "../../messages/en/profile.json";
import enReports from "../../messages/en/reports.json";
import enZiwei from "../../messages/en/ziwei.json";
import viCommon from "../../messages/vi/common.json";
import viNavigation from "../../messages/vi/navigation.json";
import viAuth from "../../messages/vi/auth.json";
import viProfile from "../../messages/vi/profile.json";
import viReports from "../../messages/vi/reports.json";
import viZiwei from "../../messages/vi/ziwei.json";
import {routing} from "./routing";

const messages = {
  vi: {common: viCommon, navigation: viNavigation, auth: viAuth, profile: viProfile, reports: viReports, ziwei: viZiwei},
  en: {common: enCommon, navigation: enNavigation, auth: enAuth, profile: enProfile, reports: enReports, ziwei: enZiwei},
};

export default getRequestConfig(async ({requestLocale}) => {
  const requestedLocale = await requestLocale;
  const locale =
    requestedLocale === "en" || requestedLocale === "vi"
      ? requestedLocale
      : routing.defaultLocale;

  return {
    locale,
    messages: messages[locale],
  };
});
