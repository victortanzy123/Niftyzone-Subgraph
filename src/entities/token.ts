import { Address, BigInt } from "@graphprotocol/graph-ts";
// Schemas:
import { Token } from "../../generated/schema";

// ABIs:
import { ERC721 } from "../../generated/NiftyzoneMarketplace/ERC721";
import { ERC1155 } from "../../generated/NiftyzoneMarketplace/ERC1155";

// Constants/Helper:
import { getNiftyzoneTokenEntityId, setSyncingIndex } from "../utils/helper";

// Niftyzone Token -> ID = address-tokenId
export function getToken(tokenId: string, contractAddress: string): Token {
  let tokenEntityId = getNiftyzoneTokenEntityId(contractAddress, tokenId);

  let token = Token.load(tokenEntityId);

  if (!token) {
    token = new Token(tokenEntityId);
    token.type = "ERC1155";
    token.name = getName(contractAddress);
    token.symbol = getSymbol(contractAddress);
    token.tokenUri = getTokenUri(contractAddress, BigInt.fromString(tokenId));
    setSyncingIndex("tokens", token);
  }

  token.save();

  return token;
}

// Metadata helper functions:
export function getName(address: string): string {
  let contract = ERC721.bind(Address.fromString(address));
  const result = contract.try_name();

  if (result.reverted) {
    return "unknown";
  }
  return result.value;
}

export function getSymbol(address: string): string {
  let contract = ERC721.bind(Address.fromString(address));
  const result = contract.try_symbol();

  if (result.reverted) {
    return "unknown";
  }
  return result.value;
}

export function getTokenUri(address: string, tokenId: BigInt): string {
  let contract_721 = ERC721.bind(Address.fromString(address));

  const tokenUriResult = contract_721.try_tokenURI(tokenId);

  let contract_1155 = ERC1155.bind(Address.fromString(address));
  const uriResult = contract_1155.try_uri(tokenId);

  if (!tokenUriResult.reverted && uriResult.reverted) {
    return tokenUriResult.value;
  }

  if (tokenUriResult.reverted && !uriResult.reverted) {
    return uriResult.value;
  }

  return "unknown";
}
