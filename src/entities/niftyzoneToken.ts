import { Address, BigInt, Bytes, ipfs, json } from "@graphprotocol/graph-ts";

// ABIs:
import { NiftyzoneMinter } from "../../generated/NiftyzoneMinter/NiftyzoneMinter";

// Schemas:
import { NiftyzoneToken } from "../../generated/schema";

// Constants/Helper:
import { ZERO_BI, IPFS_HASH_LENGTH, BPS_BI } from "../utils/constants.template";
import { getNiftyzoneTokenEntityId } from "../utils/helper";
import {
  NATIVE,
  setSyncingIndex,
  getNiftyzoneTokenIpfsHash,
} from "../utils/helper";

export class RoyaltyInfo {
  royaltiesAmount: BigInt;
  receiver: string;

  constructor(royaltiesAmount: BigInt, receiver: string) {
    this.royaltiesAmount = royaltiesAmount;
    this.receiver = receiver;
  }
}
// Niftyzone Token -> ID = address-tokenId
export function getNiftyzoneToken(
  tokenId: BigInt,
  contractAddress: string
): NiftyzoneToken {
  let niftyzoneTokenId = getNiftyzoneTokenEntityId(
    contractAddress,
    tokenId.toString()
  );
  // Load token from existing Graph node:
  let niftyzoneToken = NiftyzoneToken.load(niftyzoneTokenId);
  if (!niftyzoneToken) {
    niftyzoneToken = new NiftyzoneToken(niftyzoneTokenId);
    niftyzoneToken.token = contractAddress;
    niftyzoneToken.creator = NATIVE;
    niftyzoneToken.timestampCreatedAt = ZERO_BI;

    // Royalty Info for tokenId
    let royaltyInfo = getRoyaltiesInfo(contractAddress, tokenId);

    niftyzoneToken.secondaryRoyalties = royaltyInfo.royaltiesAmount;
    niftyzoneToken.royaltiesReceiver = royaltyInfo.receiver;

    // Token Supply of tokenId
    let totalSupply = getTokenTotalSupply(contractAddress, tokenId);
    niftyzoneToken.totalSupply = totalSupply;

    // Retrieve metadata of tokenId
    let ipfsResult = getTokenMetadata(contractAddress, tokenId);

    if (ipfsResult) {
      const metadata = json.fromBytes(ipfsResult).toObject();

      const image = metadata.get("image");
      const name = metadata.get("name");
      const description = metadata.get("description");
      const externalURL = metadata.get("external_url");
      const artist = metadata.get("artist");

      if (name && image && description && externalURL) {
        niftyzoneToken.name = name.toString();
        niftyzoneToken.image = image.toString();
        niftyzoneToken.externalUrl = externalURL.toString();
        niftyzoneToken.description = description.toString();
      }

      if (artist) {
        niftyzoneToken.artist = artist.toString();
      }
    }
    setSyncingIndex("niftyzonetokens", niftyzoneToken);

    niftyzoneToken.save();
  }

  return niftyzoneToken;
}

// Metadata helper functions:
export function getName(address: string): string {
  let contract = NiftyzoneMinter.bind(Address.fromString(address));
  const result = contract.try_name();

  if (result.reverted) {
    return "unknown";
  }
  return result.value;
}

export function getSymbol(address: string): string {
  let contract = NiftyzoneMinter.bind(Address.fromString(address));
  const result = contract.try_symbol();

  if (result.reverted) {
    return "unknown";
  }
  return result.value;
}

export function getTokenUri(address: string, tokenId: BigInt): string {
  let contract = NiftyzoneMinter.bind(Address.fromString(address));
  const result = contract.try_uri(tokenId);

  if (result.reverted) {
    return "unknown";
  }
  return result.value;
}

export function getTokenTotalSupply(address: string, tokenId: BigInt): BigInt {
  let contract = NiftyzoneMinter.bind(Address.fromString(address));
  const result = contract.try_tokenIdQuantityCount(tokenId);

  if (result.reverted) {
    return ZERO_BI;
  }
  return result.value;
}

export function getRoyaltiesInfo(
  address: string,
  tokenId: BigInt
): RoyaltyInfo {
  let contract = NiftyzoneMinter.bind(Address.fromString(address));
  const result = contract.try_royaltyInfo(tokenId, BPS_BI);

  if (result.reverted) {
    return new RoyaltyInfo(ZERO_BI, NATIVE);
  }

  const royaltyInfo: RoyaltyInfo = new RoyaltyInfo(
    result.value.getValue1(),
    result.value.getValue0().toHexString()
  );

  return royaltyInfo;
}

export function getTokenMetadata(
  address: string,
  tokenId: BigInt
): Bytes | null {
  let tokenUri = getTokenUri(address, tokenId);

  // Retrieve IPFS hash from tokenUri
  let metadataIpfs = getNiftyzoneTokenIpfsHash(
    tokenUri.slice(-IPFS_HASH_LENGTH)
  );

  // Get metadata from IPFS
  let metadata = ipfs.cat(metadataIpfs);

  return metadata;
}
