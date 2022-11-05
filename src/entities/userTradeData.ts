import { dataSource } from "@graphprotocol/graph-ts";

// Schema:
import { UserTradeData } from "../../generated/schema";

// Constants/Helper:
import { ZERO_BD, ZERO_BI } from "../utils/constants.template";
import { setSyncingIndex } from "../utils/helper";

export function getUserTradeData(user: string): UserTradeData {
  let userTradeData = UserTradeData.load(user);

  if (!userTradeData) {
    userTradeData = new UserTradeData(user);

    userTradeData.user = user;
    userTradeData.network = dataSource.network();
    userTradeData.purchased = ZERO_BI;
    userTradeData.sold = ZERO_BI;
    userTradeData.buyVolume = ZERO_BD;
    userTradeData.saleVolume = ZERO_BD;
    userTradeData.listings = [];
    setSyncingIndex("usertradedatas", userTradeData);

    userTradeData.save();
  }

  return userTradeData;
}
