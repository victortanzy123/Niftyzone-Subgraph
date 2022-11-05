import { BigInt } from "@graphprotocol/graph-ts";

// Schema:
import { MarketItem } from "../../generated/schema";
import { ZERO_BD, ZERO_BI } from "../utils/constants.template";
import { NATIVE, setSyncingIndex } from "../utils/helper";

export function getMarketItem(tokenId: BigInt): MarketItem {
  let marketItem = MarketItem.load(tokenId.toString());

  if (!marketItem) {
    marketItem = new MarketItem(tokenId.toString());
    marketItem.token = NATIVE;
    marketItem.originalQuantityListed = ZERO_BI;
    marketItem.quantityListed = ZERO_BI;
    marketItem.timestampCreatedAt = ZERO_BI;
    marketItem.listed = false;
    marketItem.deadline = ZERO_BI;
    marketItem.seller = NATIVE;
    marketItem.currency = NATIVE;
    marketItem.price = ZERO_BD;
    setSyncingIndex("marketitems", marketItem);

    marketItem.save();
  }

  return marketItem;
}
