import { ROLE_AVAILABLE_COMMANDS } from '../../../config/role-commands';

const getAvailableEvents = ({ isAdmin, isOwner }: { isAdmin: boolean; isOwner: boolean }) => {
  if (isOwner) {
    return {
      ...ROLE_AVAILABLE_COMMANDS.USER,
      ...ROLE_AVAILABLE_COMMANDS.ADMIN,
      ...ROLE_AVAILABLE_COMMANDS.OWNER,
    };
  }

  if (isAdmin) {
    return {
      ...ROLE_AVAILABLE_COMMANDS.USER,
      ...ROLE_AVAILABLE_COMMANDS.ADMIN,
    };
  }

  return ROLE_AVAILABLE_COMMANDS.USER;
};

const getDiscordEventType = (command: string, userType: { isAdmin: boolean; isOwner: boolean }) => {
  const eventsList = getAvailableEvents(userType);
  const event = eventsList[command];

  if (!event) {
    return;
  }

  return event;
};

export { getDiscordEventType, getAvailableEvents };
export default { getDiscordEventType, getAvailableEvents };
