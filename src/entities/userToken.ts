// Schema:
import { UserToken } from "../../generated/schema";

// Helper:
import { ZERO_BI } from "../utils/constants.template";
import { setSyncingIndex } from "../utils/helper";

export function getUserToken(user: string, token: string): UserToken {
  let id = user + "-" + token;
  let userToken = UserToken.load(id);

  if (!userToken) {
    userToken = new UserToken(id);

    userToken.user = user;
    userToken.token = token;
    userToken.totalSent = ZERO_BI;
    userToken.totalReceived = ZERO_BI;
    userToken.balance = ZERO_BI;
    setSyncingIndex("userTokens", userToken);

    userToken.save();
  }

  return userToken;
}
