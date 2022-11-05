// Schemas:
import { Offer } from "../../generated/schema";

// Constants/Helper:
import { ZERO_BI } from "../utils/constants.template";
import { NATIVE, setSyncingIndex } from "../utils/helper";

// OfferId -> marketplaceAddress-ListingId-OfferId
// @ Need call handler since expiration timestamp is not emitted in the event.
export function getOffer(offerId: string): Offer {
  let offer = Offer.load(offerId);

  if (!offer) {
    offer = new Offer(offerId);
    offer.listingId = ZERO_BI;
    offer.offeror = NATIVE;
    offer.currency = NATIVE;
    setSyncingIndex("offers", offer);
  }

  offer.save();

  return offer;
}
