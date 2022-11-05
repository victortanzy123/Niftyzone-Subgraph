import { Address, BigInt, ipfs, json } from "@graphprotocol/graph-ts";

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
  RoyaltyInfo,
} from "../utils/helper";

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
    let metadata = getTokenMetadata(contractAddress, tokenId);

    niftyzoneToken.name = metadata.get("name") ?? "";
    niftyzoneToken.image = metadata.get("image") ?? "";
    niftyzoneToken.description = metadata.get("description") ?? "";
    niftyzoneToken.externalUrl = metadata.get("external_url") ?? "";
    niftyzoneToken.artist = metadata.get("artist") ?? "";
    setSyncingIndex("niftyzonetokens", niftyzoneToken);
  }

  niftyzoneToken.save();

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
    return { royaltiesAmount: ZERO_BI, receiver: NATIVE };
  }

  const royaltyInfo = {
    royaltiesAmount: result.value.getValue1(),
    receiver: result.value.getValue0().toHexString(),
  };

  return royaltyInfo;
}

export function getTokenMetadata(address: string, tokenId: BigInt): any {
  let tokenUri = getTokenUri(address, tokenId);

  // Retrieve IPFS hash from tokenUri
  let metadataIpfs = getNiftyzoneTokenIpfsHash(
    tokenUri.slice(-IPFS_HASH_LENGTH)
  );

  // Get metadata from IPFS
  let metadata = ipfs.cat(metadataIpfs);

  return metadata ? json.fromBytes(metadata).toObject() : null;
}
