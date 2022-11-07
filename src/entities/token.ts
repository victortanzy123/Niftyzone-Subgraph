// Schemas:
import { NiftyzoneToken } from "../../generated/schema";

// Constants/Helper:
import { ZERO_BI } from "../utils/constants.template";
import { NATIVE, setSyncingIndex } from "../utils/helper";

// Niftyzone Token -> ID = address-tokenId
export function getNiftyzoneToken(
  niftyzoneTokenId: string,
  contractAddress: string
): NiftyzoneToken {
  let niftyzoneToken = NiftyzoneToken.load(niftyzoneTokenId);
  if (!niftyzoneToken) {
    niftyzoneToken = new NiftyzoneToken(niftyzoneTokenId);
    niftyzoneToken.token = contractAddress;
    niftyzoneToken.totalSupply = ZERO_BI;
    niftyzoneToken.secondaryRoyalties = ZERO_BI;
    niftyzoneToken.royaltiesReceiver = NATIVE;
    setSyncingIndex("niftyzonetokens", niftyzoneToken);
  }

  niftyzoneToken.save();

  return niftyzoneToken;
}
