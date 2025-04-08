import { getCommandsByRole, COMMANDS_LIST } from '../../../config/role-commands';

const getAvailableEvents = ({ isAdmin, isOwner }: { isAdmin: boolean; isOwner: boolean }) => {
  const availableCommands = getCommandsByRole();

  if (isOwner) return availableCommands.owner;
  if (isAdmin) return availableCommands.admin;

  return availableCommands.user;
};

const getDiscordEventType = (command: string, userType: { isAdmin: boolean; isOwner: boolean }) => {
  const eventsList = getAvailableEvents(userType);
  const event = eventsList[command as COMMANDS_LIST];

  if (!event) {
    return;
  }

  return event;
};

export { getDiscordEventType, getAvailableEvents };
export default { getDiscordEventType, getAvailableEvents };
