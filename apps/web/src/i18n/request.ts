import {getRequestConfig} from "next-intl/server";
import enCommon from "../../messages/en/common.json";
import enNavigation from "../../messages/en/navigation.json";
import viCommon from "../../messages/vi/common.json";
import viNavigation from "../../messages/vi/navigation.json";
import {routing} from "./routing";

const messages = {
  vi: {common: viCommon, navigation: viNavigation},
  en: {common: enCommon, navigation: enNavigation},
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
