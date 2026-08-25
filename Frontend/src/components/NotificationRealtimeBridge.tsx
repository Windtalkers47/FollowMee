import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../store/store';
import { selectLatestIncomingNotification } from '../store/slices/notificationSlice';
import { feedback } from '../services/feedback.service';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { getNotificationPresentation } from '../utils/notificationPresentation';

export default function NotificationRealtimeBridge() {
  const incoming = useAppSelector(selectLatestIncomingNotification);
  const seen = useRef<number | null>(null);
  const navigate = useNavigate();
  const { t } = useUserPreferences();
  useEffect(() => {
    if (!incoming || seen.current === incoming.recipientId || incoming.notification.notificationType !== 'PUBLIC_PROFILE_LEAD') return;
    seen.current = incoming.recipientId;
    const presentation = getNotificationPresentation(incoming.notification, t);
    void feedback.info({ title: presentation.title, message: presentation.message, dedupeKey: `profile-lead:${incoming.recipientId}`, duration: 6500, nextAction: { label: t('profile.leads.openInbox'), onClick: () => navigate(incoming.notification.actionUrl || '/customer-profile/leads') } });
  }, [incoming, navigate, t]);
  return null;
}
