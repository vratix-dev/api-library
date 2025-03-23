import argon2 from "argon2";

import {
  BasicAuthSchema,
  RefreshTokenSchema,
} from "@/schemaValidators/authBasic.interface.js";

import { accessTokenManager } from "@/modules/authBasic/utils/jwt/tokenManager.js";
import {
  usernameNotAvailable,
  invalidLoginCredentials,
} from "@/modules/authBasic/utils/errors/auth.js";
import { forbiddenError } from "@/modules/shared/utils/errors/common.js";

import { User, UserRepository } from "@/repositories/user.interface.js";
import {
  RefreshToken,
  RefreshTokenRepository,
} from "@/repositories/refreshToken.interface.js";

interface TokensOutput {
  accessToken: string;
  refreshToken: RefreshToken;
}
interface AuthOutput extends TokensOutput {
  user: Omit<User, "password">;
}

interface AuthBasicController {
  login: (props: BasicAuthSchema) => Promise<AuthOutput>;
  signup: (props: BasicAuthSchema) => Promise<AuthOutput>;
  refreshToken: (props: RefreshTokenSchema) => Promise<TokensOutput>;
}

export const createAuthBasicController = (
  userRepo: UserRepository,
  refreshTokenRepo: RefreshTokenRepository
): AuthBasicController => {
  const generateTokens = async (userId: number, tokenFamily?: string) => {
    const [refreshToken, accessToken] = await Promise.all([
      generateRefreshToken(userId, tokenFamily),
      generateAccessToken(userId),
    ]);
    return { accessToken, refreshToken };
  };

  const generateAccessToken = (userId: number) => {
    return accessTokenManager.sign({ userId: userId.toString() });
  };

  const generateRefreshToken = async (userId: number, tokenFamily?: string) => {
    const expAt = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000);
    return refreshTokenRepo.createToken({
      userId,
      tokenFamily,
      expiresAt: expAt.toISOString(),
    });
  };

  const getUserOrFail = async (username: string) => {
    const user = await userRepo.getUser(username);
    if (!user) throw invalidLoginCredentials();
    return user;
  };

  return {
    async signup({ username, password, email }) {
      if (await userRepo.getUser(username)) throw usernameNotAvailable();

      const [hashedPass, newUser] = await Promise.all([
        argon2.hash(password, {
          type: argon2.argon2id,
          timeCost: 2,
          parallelism: 1,
          memoryCost: 12288, // 12 MiB for better performance/security balance
        }),
        userRepo.createAuthBasicUser({ username, email }),
      ]);

      newUser.password = hashedPass;
      const { accessToken, refreshToken } = await generateTokens(newUser.userId);

      const { password: _, ...userRes } = newUser;
      return { user: userRes, accessToken, refreshToken };
    },

    async login({ username, password }) {
      const user = await getUserOrFail(username);

      const isOk = await argon2.verify(user.password, password);
      if (!isOk) throw invalidLoginCredentials();

      const { accessToken, refreshToken } = await generateTokens(user.userId);
      const { password: _, ...userRes } = user;
      return { user: userRes, accessToken, refreshToken };
    },

    async refreshToken({ token }) {
      const tokenData = await refreshTokenRepo.getToken(token);
      if (!tokenData || !tokenData.active) {
        if (tokenData) refreshTokenRepo.invalidateTokenFamily(tokenData.tokenFamily);
        throw forbiddenError();
      }

      const { accessToken, refreshToken } = await generateTokens(tokenData.userId, tokenData.tokenFamily);
      return { accessToken, refreshToken };
    },
  };
};
