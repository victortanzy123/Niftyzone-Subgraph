import { Address, BigInt, dataSource } from "@graphprotocol/graph-ts";

// Schemas:
import { Currency } from "../../generated/schema";

// ABIs:
import { ERC20 } from "../../generated/NiftyzoneMarketplace/ERC20";

// Constants:
import { ZERO_BI } from "../utils/constants.template";
import { NATIVE, NATIVE_ALT, setSyncingIndex } from "../utils/helper";

// ERC20 Token Currencies:
export function getCurrency(address: string): Currency {
  let currency = Currency.load(address);
  if (!currency) {
    currency = new Currency(address);
    currency.type = getType(address);
    currency.name = getName(address);
    currency.symbol = getSymbol(address);
    currency.decimals = getDecimals(address);
    setSyncingIndex("currency", currency);

    currency.save();
  }

  return currency;
}

export function getName(address: string): string {
  if (isNative(address)) {
    return getNativeName();
  }

  let contract = ERC20.bind(Address.fromString(address));
  const result = contract.try_name();

  if (result.reverted) {
    return "UNKNOWN";
  }
  return result.value;
}

export function getSymbol(address: string): string {
  if (isNative(address)) {
    return getNativeName();
  }

  let contract = ERC20.bind(Address.fromString(address));
  const result = contract.try_symbol();

  if (result.reverted) {
    return "UNKNOWN";
  }
  return result.value;
}

export function getDecimals(address: string): BigInt {
  if (isNative(address)) {
    return ZERO_BI;
  }

  let contract = ERC20.bind(Address.fromString(address));
  const result = contract.try_decimals();

  if (result.reverted) {
    return ZERO_BI;
  }
  return BigInt.fromI32(result.value);
}

function isNative(id: string): boolean {
  if (id.toLowerCase() == NATIVE || id.toLowerCase() == NATIVE_ALT) return true;

  return false;
}

function getNativeName(): string {
  if (dataSource.network() == "bsc") {
    return "BNB";
  } else if (dataSource.network() == "ethereum") {
    return "ETH";
  } else if (dataSource.network() == "polygon") {
    return "MATIC";
  }
  return dataSource.network();
}

function getType(id: string): string {
  return isNative(id) ? "NATIVE" : "ERC20";
}
