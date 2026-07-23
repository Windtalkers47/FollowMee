/**
 * Notification Aggregator Utility
 * 
 * Provides helper functions for aggregating notification titles and messages
 * when multiple users perform similar actions.
 */

export interface ActorInfo {
  userId: number;
  userName?: string;
  userLastName?: string;
  userImageUrl?: string | null;
}

/**
 * Aggregate title based on actor count and type
 */
export function aggregateTitle(
  baseTitle: string,
  actorCount: number,
  notificationType?: string
): string {
  if (actorCount <= 1) {
    return baseTitle;
  }

  // Handle specific notification types
  if (notificationType) {
    switch (notificationType) {
      case 'TASK_LIKE':
      case 'COMMENT_REACTION':
        return `${baseTitle} (${actorCount} people)`;
      case 'TASK_COMMENT':
      case 'COMMENT_REPLY':
        return `${baseTitle} (${actorCount} comments)`;
      case 'TASK_ASSIGNED':
        return `${baseTitle} (${actorCount} assignments)`;
      default:
        return `${baseTitle} (${actorCount} updates)`;
    }
  }

  // Generic aggregation
  if (baseTitle.includes('Like') || baseTitle.includes('Reaction')) {
    return `${baseTitle} (${actorCount} people)`;
  }
  if (baseTitle.includes('Comment')) {
    return `${baseTitle} (${actorCount} comments)`;
  }
  return `${baseTitle} (${actorCount} updates)`;
}

/**
 * Aggregate message based on actor list
 * 
 * @param baseMessage - Original message template
 * @param actors - List of actor info
 * @param maxDisplay - Maximum number of names to display (default: 3)
 * @returns Aggregated message with Thai language support
 */
export function aggregateMessage(
  baseMessage: string,
  actors: ActorInfo[],
  maxDisplay: number = 3
): string {
  if (actors.length <= 1) {
    return baseMessage;
  }

  const additionalCount = actors.length - maxDisplay;

  if (additionalCount > 0) {
    // Thai: "และอีก X คน"
    return `${baseMessage} และอีก ${additionalCount} คน`;
  }

  // Show count in parentheses
  return `${baseMessage} (${actors.length} people)`;
}

/**
 * Aggregate message with actor names
 * 
 * Formats: "User A, User B และอีก 5 คน"
 * 
 * @param actors - List of actor info
 * @param maxDisplay - Maximum number of names to display (default: 3)
 * @returns Formatted names string
 */
export function formatActorNames(
  actors: ActorInfo[],
  maxDisplay: number = 3
): string {
  if (actors.length === 0) {
    return '';
  }

  if (actors.length === 1) {
    const actor = actors[0];
    return formatActorName(actor);
  }

  const displayCount = Math.min(actors.length, maxDisplay);
  const displayActors = actors.slice(0, displayCount);
  const names = displayActors.map(actor => formatActorName(actor));

  const additionalCount = actors.length - maxDisplay;

  if (additionalCount > 0) {
    // Thai format: "A, B และอีก X คน"
    const mainPart = names.join(', ');
    return `${mainPart} และอีก ${additionalCount} คน`;
  }

  // English format for small groups
  if (actors.length <= maxDisplay) {
    if (actors.length === 2) {
      return names.join(' และ ');
    }
    // For 3+ people, use Oxford comma style
    return names.slice(0, -1).join(', ') + ' และ ' + names[names.length - 1];
  }

  return names.join(', ');
}

/**
 * Format a single actor's name
 */
function formatActorName(actor: ActorInfo): string {
  if (actor.userName && actor.userLastName) {
    return `${actor.userName} ${actor.userLastName}`;
  }
  if (actor.userName) {
    return actor.userName;
  }
  return `User #${actor.userId}`;
}

/**
 * Create aggregated notification data
 */
export interface AggregatedNotificationData {
  title: string;
  message: string;
  actorCount: number;
  previewActors: ActorInfo[];
}

/**
 * Create aggregated notification data from actor list
 */
export function createAggregatedData(
  baseTitle: string,
  baseMessage: string,
  actors: ActorInfo[],
  notificationType?: string
): AggregatedNotificationData {
  const actorCount = actors.length;

  return {
    title: aggregateTitle(baseTitle, actorCount, notificationType),
    message: aggregateMessage(baseMessage, actors),
    actorCount,
    previewActors: actors.slice(0, 3),
  };
}

/**
 * Check if notification type should be aggregated
 * 
 * Some notification types (like system announcements) should not be aggregated
 */
export function shouldAggregate(notificationType: string): boolean {
  const aggregatableTypes = [
    'TASK_LIKE',
    'COMMENT_REACTION',
    'TASK_COMMENT',
    'COMMENT_REPLY',
  ];

  return aggregatableTypes.includes(notificationType);
}

/**
 * Get aggregation time window for notification type
 * 
 * Different types may have different debounce delays
 */
export function getAggregationDelay(notificationType: string): number {
  // Likes and reactions: 5 minutes (more frequent, more aggregation)
  if (['TASK_LIKE', 'COMMENT_REACTION'].includes(notificationType)) {
    return 300000; // 5 minutes
  }

  // Comments: 2 minutes (need faster delivery)
  if (['TASK_COMMENT', 'COMMENT_REPLY'].includes(notificationType)) {
    return 120000; // 2 minutes
  }

  // Default: 5 minutes
  return 300000;
}