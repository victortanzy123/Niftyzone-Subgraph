import { dataSource } from "@graphprotocol/graph-ts";

// Schema:
import {
  MarketItem,
  MarketItemCreation,
  MarketItemUpdate,
  MarketItemSale,
  Offer,
  MarketItemDelist,
} from "../../generated/schema";

// ABIs:
import {
  MarketItemCreated as MarketItemCreatedEvent,
  MarketItemSale as MarketItemSaleEvent,
  MarketItemPriceUpdate as MarketItemPriceUpdateEvent,
  MarketItemDelisted as MarketItemDelistedEvent,
  NewOffer as NewOfferEvent,
} from "../../generated/NiftyzoneMarketplace/NiftyzoneMarketplace";

// Entities
import { getCurrency } from "../entities/currency";
import { getMarketItem } from "../entities/marketListing";
import { getUserTradeData } from "../entities/userTradeData";
import { getToken } from "../entities/token";

// Constants/Helper
import {
  getMarketItemCreationId,
  getMarketItemDelistId,
  getMarketItemSaleId,
  getMarketItemUpdateId,
  getNewOfferId,
  setSyncingIndex,
  toDecimal,
} from "../utils/helper";

// @Desc: Saves both the event of creating a listing & also a marketItem object for tracking as transactions occurs.
export function handleMarketItemCreated(event: MarketItemCreatedEvent): void {
  let hash = event.block.hash.toHexString();
  let index = event.logIndex;
  let blockNumber = event.block.number;
  let listingId = event.params.listingId;

  let currencyAddress = event.params.currency.toHexString();
  let quantityListed = event.params.quantity;
  let timestamp = event.block.timestamp;
  let deadline = event.params.deadline;

  let currency = getCurrency(currencyAddress);
  let price = toDecimal(event.params.price, currency.decimals);

  let seller = event.params.seller.toHexString();

  // Retrieve or create token object:
  let token = getToken(
    event.params.tokenId.toString(),
    event.params.nftContract.toHexString()
  );

  token.save();

  // Create Item Creation Event:
  let marketItemCreationId = getMarketItemCreationId(hash, index, listingId);
  let marketItemCreation = new MarketItemCreation(marketItemCreationId);

  marketItemCreation.txHash = hash;
  marketItemCreation.blockNumber = blockNumber;
  marketItemCreation.token = token.id;
  marketItemCreation.quantity = quantityListed;
  marketItemCreation.currency = currencyAddress;
  marketItemCreation.price = price;
  marketItemCreation.timestampCreatedAt = timestamp;
  marketItemCreation.deadline = deadline;
  marketItemCreation.seller = seller;
  setSyncingIndex("marketitemcreations", marketItemCreation);

  marketItemCreation.save();

  // Create Market Item for dynamic tracking:
  let marketItem = new MarketItem(event.params.listingId.toString());

  marketItem.token = token.id;
  marketItem.originalQuantityListed = quantityListed;
  marketItem.quantityListed = quantityListed;
  marketItem.timestampCreatedAt = timestamp;
  marketItem.listed = true;
  marketItem.deadline = deadline;
  marketItem.seller = seller;
  marketItem.currency = currencyAddress;
  marketItem.price = price;
  setSyncingIndex("marketitems", marketItem);

  marketItem.save();
}

// @Desc: Saves both the event of a sale transaction from a valid listing & also update the marketItem object and user trade data (both buyer and seller)
export function handleMarketItemSale(event: MarketItemSaleEvent): void {
  let hash = event.block.hash.toHexString();
  let index = event.logIndex;
  let blockNumber = event.block.number;
  let timestamp = event.block.timestamp;

  let listingId = event.params.listingId;
  let currencyAddress = event.params.currency.toHexString();
  let seller = event.params.seller.toHexString();
  let buyer = event.params.buyer.toHexString();

  // Retrieve or create token object:
  let token = getToken(
    event.params.tokenId.toString(),
    event.params.nftContract.toHexString()
  );

  token.save();

  // Save Market Sale Transaction
  let marketItemSaleId = getMarketItemSaleId(hash, index, listingId);
  let marketItemSale = new MarketItemSale(marketItemSaleId);
  marketItemSale.token = token.id;
  marketItemSale.txHash = hash;
  marketItemSale.blockNumber = blockNumber;
  marketItemSale.timestampCreatedAt = timestamp;
  marketItemSale.quantityPurchased = event.params.quantityBought;
  marketItemSale.currency = currencyAddress;

  let currency = getCurrency(currencyAddress);
  marketItemSale.totalPricePaid = toDecimal(
    event.params.totalPricePaid,
    currency.decimals
  );
  marketItemSale.seller = seller;
  marketItemSale.buyer = buyer;
  setSyncingIndex("marketitemsales", marketItemSale);

  marketItemSale.save();

  // Update Market Item Object
  let marketItem = getMarketItem(event.params.listingId);

  marketItem.quantityListed = marketItem.quantityListed.minus(
    event.params.quantityBought
  );

  marketItem.save();

  // Update User Trading Data:
  let sellerTradeData = getUserTradeData(seller);

  sellerTradeData.sold = sellerTradeData.sold.plus(
    marketItemSale.quantityPurchased
  );
  sellerTradeData.saleVolume = sellerTradeData.saleVolume.plus(
    marketItemSale.totalPricePaid
  );

  sellerTradeData.save();

  let buyerTradeData = getUserTradeData(buyer);
  buyerTradeData.purchased = buyerTradeData.purchased.plus(
    marketItemSale.quantityPurchased
  );
  buyerTradeData.buyVolume = buyerTradeData.buyVolume.plus(
    marketItemSale.totalPricePaid
  );

  buyerTradeData.save();
}

// @Desc: Saves both the event of a market item price update transaction from a valid listing & also update the marketItem object
export function handleMarketItemPriceUpdate(
  event: MarketItemPriceUpdateEvent
): void {
  let hash = event.block.hash.toHexString();
  let logIndex = event.logIndex;
  let blockNumber = event.block.number;
  let timestamp = event.block.timestamp;

  let listingId = event.params.listingId;
  let seller = event.params.seller.toHexString();

  let currencyAddress = event.params.currency.toHexString();
  let currency = getCurrency(currencyAddress);

  let newPrice = toDecimal(event.params.newPrice, currency.decimals);

  // Create new Market Item Update entity:
  let marketItemUpdateId = getMarketItemUpdateId(hash, logIndex, listingId);

  let marketItemUpdate = new MarketItemUpdate(marketItemUpdateId);

  marketItemUpdate.txHash = hash;
  marketItemUpdate.blockNumber = blockNumber;
  marketItemUpdate.timestampCreatedAt = timestamp;
  marketItemUpdate.seller = seller;
  marketItemUpdate.newPrice = newPrice;
  setSyncingIndex("marketitemupdates", marketItemUpdate);

  marketItemUpdate.save();

  // Update Market Item upon updating listing price
  let marketItem = getMarketItem(event.params.listingId);

  marketItem.price = newPrice;
  // @To-do: Deal with updated deadline

  marketItem.save();
}

// @Desc: Saves both the event of a market item delist transaction from a valid listing & also update the marketItem object
export function handleMarketItemDelisted(event: MarketItemDelistedEvent): void {
  let hash = event.block.hash.toHexString();
  let logIndex = event.logIndex;
  let blockNumber = event.block.number;
  let timestamp = event.block.timestamp;

  let listingId = event.params.listingId;
  let seller = event.params.seller.toHexString();

  let marketItemDelistId = getMarketItemDelistId(hash, logIndex, listingId);

  // Create Market Item Delist Entity
  let marketItemDelist = new MarketItemDelist(marketItemDelistId);

  marketItemDelist.txHash = hash;
  marketItemDelist.timestampCreatedAt = timestamp;
  marketItemDelist.blockNumber = blockNumber;
  marketItemDelist.seller = seller;
  setSyncingIndex("marketitemdelists", marketItemDelist);

  marketItemDelist.save();

  // Update market item:
  let marketItem = getMarketItem(event.params.listingId);

  marketItem.listed = false;

  marketItem.save();
}

export function handleNewOffer(event: NewOfferEvent): void {
  let offeror = event.params.offeror.toHexString();
  let niftyzoneMarketplace = dataSource.address().toHexString();
  let listingId = event.params.listingId;
  let currencyAddress = event.params.currency.toHexString();

  let newOfferId = getNewOfferId(offeror, niftyzoneMarketplace, listingId);

  let offer = new Offer(newOfferId);

  offer.offeror = offeror;
  offer.listingId = listingId;
  offer.desiredQuantity = event.params.desiredQuantity;

  let currency = getCurrency(currencyAddress);
  offer.currency = currencyAddress;
  offer.totalOfferAmount = toDecimal(
    event.params.totalOfferAmount,
    currency.decimals
  );
  setSyncingIndex("offers", offer);

  offer.save();
}
