// Schema:
import { MarketItem, MarketItemSale, Offer } from "../../generated/schema";

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

// Constants/Helper
import {
  getMarketItemSaleId,
  getNewOfferId,
  setSyncingIndex,
  toDecimal,
} from "../utils/helper";
import { dataSource } from "@graphprotocol/graph-ts";
import { getUserTradeData } from "../entities/userTradeData";

export function handleMarketItemCreated(event: MarketItemCreatedEvent): void {
  let marketItem = new MarketItem(event.params.listingId.toString());

  marketItem.token = event.params.nftContract.toHexString();
  marketItem.originalQuantityListed = event.params.quantity;
  marketItem.quantityListed = event.params.quantity;
  marketItem.timestampCreatedAt = event.block.timestamp;
  marketItem.listed = true;
  marketItem.deadline = event.params.deadline;
  marketItem.seller = event.params.seller.toHexString();
  marketItem.currency = event.params.currency.toHexString();

  let currency = getCurrency(event.params.currency.toHexString());
  marketItem.price = toDecimal(event.params.price, currency.decimals);

  marketItem.save();

  // Update user trade data:
}

export function handleMarketItemSale(event: MarketItemSaleEvent): void {
  let hash = event.block.hash;
  let index = event.logIndex;
  let listingId = event.params.listingId;
  let currencyAddress = event.params.currency.toHexString();
  let seller = event.params.seller.toHexString();
  let buyer = event.params.buyer.toHexString();

  // Save Market Sale Transaction
  let marketItemSaleId = getMarketItemSaleId(hash.toString(), index, listingId);
  let marketItemSale = new MarketItemSale(marketItemSaleId);
  marketItemSale.token = event.params.nftContract.toHexString();
  marketItemSale.quantityBought = event.params.quantityBought;
  marketItemSale.currency = currencyAddress;

  let currency = getCurrency(currencyAddress);
  marketItemSale.totalPricePaid = toDecimal(
    event.params.totalPricePaid,
    currency.decimals
  );
  marketItemSale.seller = event.params.seller.toHexString();
  marketItemSale.buyer = event.params.buyer.toHexString();
  setSyncingIndex("marketitemsales", marketItemSale);

  marketItemSale.save();

  // Update Market Item
  let marketItem = getMarketItem(event.params.listingId);

  marketItem.quantityListed = marketItem.quantityListed.minus(
    event.params.quantityBought
  );

  marketItem.save();

  // Update User Trading Data:
  let sellerTradeData = getUserTradeData(seller);

  sellerTradeData.sold = sellerTradeData.sold.plus(
    marketItemSale.quantityBought
  );
  sellerTradeData.saleVolume = sellerTradeData.saleVolume.plus(
    marketItemSale.totalPricePaid
  );

  let buyerTradeData = getUserTradeData(buyer);
  buyerTradeData.purchased = buyerTradeData.purchased.plus(
    marketItemSale.quantityBought
  );
  buyerTradeData.buyVolume = buyerTradeData.buyVolume.plus(
    marketItemSale.totalPricePaid
  );
}

export function handleMarketItemPriceUpdate(
  event: MarketItemPriceUpdateEvent
): void {
  let marketItem = getMarketItem(event.params.listingId);

  let currency = getCurrency(marketItem.currency);
  marketItem.price = toDecimal(event.params.newPrice, currency.decimals);
  // @To-do: Deal with updated deadline

  marketItem.save();
}

export function handleMarketItemDelisted(event: MarketItemDelistedEvent): void {
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
