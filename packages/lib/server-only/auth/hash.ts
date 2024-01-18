import { compareSync as bcryptCompareSync, hashSync as bcryptHashSync } from 'bcrypt';

import { SALT_ROUNDS } from '../../constants/auth';

/**
 * @deprecated Use the methods built into `bcrypt` instead
 */
export const hashSync = (password: string) => {
  return bcryptHashSync(password, SALT_ROUNDS);
};

export const compareSync = (password: string, hash: string) => {
  return bcryptCompareSync(password, hash);
};
