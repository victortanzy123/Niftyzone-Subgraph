import { dataSource } from "@graphprotocol/graph-ts";

// Events from ABI:
import {
  TransferSingle as TransferSingleEvent,
  TransferBatch as TransferBatchEvent,
  tokenCreation as TokenCreation,
} from "../../generated/NiftyzoneMinter/NiftyzoneMinter";

// Schemas:
import { NiftyzoneToken, Transfer } from "../../generated/schema";
import {
  getNiftyzoneToken,
  getTokenMetadata,
  getTokenTotalSupply,
} from "../entities/niftyzoneToken";
import { getUser } from "../entities/user";
import { getUserToken } from "../entities/userToken";

// Constants/Helpers:
import {
  getTransferId,
  getNiftyzoneTokenEntityId,
  setSyncingIndex,
} from "../utils/helper";

// Handle TransferSingle events:
export function handleTransferSingle(event: TransferSingleEvent): void {
  let niftyzoneMinter = dataSource.address().toHexString();
  let tokenId = event.params.id;
  let niftyzoneToken = getNiftyzoneToken(tokenId, niftyzoneMinter);

  niftyzoneToken.save();

  let hash = event.transaction.hash.toHexString();
  let index = event.logIndex;
  let blockNumber = event.block.number;
  let blockTimestamp = event.block.timestamp;

  let transferId = getTransferId(hash, index, tokenId);

  // Create new Transfer object:
  let transfer = new Transfer(transferId);
  transfer.hash = hash;
  transfer.token = dataSource.address().toHexString();
  transfer.operator = event.params.operator.toHexString();
  transfer.from = event.params.from.toHexString();
  transfer.to = event.params.to.toHexString();
  transfer.value = event.params.value;
  transfer.blockNumber = blockNumber;
  transfer.timestamp = blockTimestamp;
  setSyncingIndex("transfers", transfer);

  transfer.save();

  let from = getUser(event.params.from.toHexString());
  let to = getUser(event.params.to.toHexString());

  // Update UserToken Data:
  let fromUserToken = getUserToken(from.id, tokenId.toString());
  fromUserToken.totalReceived = fromUserToken.totalReceived.plus(
    event.params.value
  );
  fromUserToken.balance = fromUserToken.balance.plus(event.params.value);

  fromUserToken.save();

  let toUserToken = getUserToken(to.id, tokenId.toString());
  toUserToken.totalSent = toUserToken.totalSent.plus(event.params.value);
  toUserToken.balance = toUserToken.balance.minus(event.params.value);

  toUserToken.save();
}

// Handle TransferSingle events:
export function handleTransferBatch(event: TransferBatchEvent): void {
  let niftyzoneMinter = dataSource.address().toHexString();
  let tokens = event.params.ids;
  let amounts = event.params.values;

  // Retrieve and save all tokens in the graph node
  for (let i = 0; i < tokens.length; i++) {
    let niftyzoneToken = getNiftyzoneToken(tokens[i], niftyzoneMinter);

    niftyzoneToken.save();
  }

  let hash = event.transaction.hash.toHexString();
  let index = event.logIndex;
  let blockNumber = event.block.number;
  let blockTimestamp = event.block.timestamp;

  for (let i = 0; i < tokens.length; i++) {
    let transferId = getTransferId(hash, index, tokens[i]);

    // Create new Transfer object:
    let transfer = new Transfer(transferId);
    transfer.hash = hash;
    transfer.token = dataSource.address().toHexString();
    transfer.operator = event.params.operator.toHexString();
    transfer.from = event.params.from.toHexString();
    transfer.to = event.params.to.toHexString();
    transfer.value = amounts[i];
    transfer.blockNumber = blockNumber;
    transfer.timestamp = blockTimestamp;
    setSyncingIndex("transfers", transfer);

    transfer.save();

    // Update UserToken Data
    let from = getUser(event.params.from.toHexString());
    let to = getUser(event.params.to.toHexString());

    let fromUserToken = getUserToken(from.id, tokens[i].toString());
    fromUserToken.totalReceived = fromUserToken.totalReceived.plus(amounts[i]);
    fromUserToken.balance = fromUserToken.balance.plus(amounts[i]);

    fromUserToken.save();

    let toUserToken = getUserToken(to.id, tokens[i].toString());
    toUserToken.totalSent = toUserToken.totalSent.plus(amounts[i]);
    toUserToken.balance = toUserToken.balance.minus(amounts[i]);

    toUserToken.save();
  }
}

export function handleTokenCreation(event: TokenCreation): void {
  let blockTimestamp = event.block.timestamp;
  let niftyzoneMinter = dataSource.address().toHexString();
  let tokenId = event.params.tokenId;

  let niftyzoneTokenId = getNiftyzoneTokenEntityId(
    niftyzoneMinter,
    tokenId.toString()
  );

  // Save token on the graph node:
  let niftyzoneToken = new NiftyzoneToken(niftyzoneTokenId);

  niftyzoneToken.token = niftyzoneMinter;
  niftyzoneToken.creator = event.params.creator.toHexString();
  niftyzoneToken.timestampCreatedAt = blockTimestamp;

  // Royalties Info get directly from event:
  niftyzoneToken.secondaryRoyalties = event.params.royaltyPercent;
  niftyzoneToken.royaltiesReceiver = event.params.royaltyAddr.toHexString();

  // Total supply of tokenId
  let totalSupply = getTokenTotalSupply(niftyzoneMinter, tokenId);
  niftyzoneToken.totalSupply = totalSupply;

  // Metadata of tokenId
  let metadata = getTokenMetadata(niftyzoneMinter, tokenId);
  niftyzoneToken.name = metadata.get("name") ?? "";
  niftyzoneToken.image = metadata.get("image") ?? "";
  niftyzoneToken.description = metadata.get("description") ?? "";
  niftyzoneToken.externalUrl = metadata.get("external_url") ?? "";
  niftyzoneToken.artist = metadata.get("artist") ?? "";

  niftyzoneToken.save();
}
