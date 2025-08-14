import axios from 'axios';

import { INTERNAL_BASE_URL, INTERNAL_API_KEY } from '../config/env';
import logger from './logger';

const api = axios.create({
  baseURL: INTERNAL_BASE_URL,
  params: {
    uid: INTERNAL_API_KEY,
  },
});

const getFacts = async (id: string) => {
  try {
    const { data } = await api.get<string>(`/facts/${id}`);

    logger.info('Fetched internal facts', { id, facts: data?.length });

    return data?.length ? data : undefined;
  } catch (error: unknown) {
    logger.error('Error fetching facts', error);
  }
};

export default { getFacts };
