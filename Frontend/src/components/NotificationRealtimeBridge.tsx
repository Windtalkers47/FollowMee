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
    if (!incoming || seen.current === incoming.recipientId || !['PUBLIC_PROFILE_LEAD','REGISTRATION_APPROVAL_REQUIRED','SYSTEM_CAPACITY_ALERT','PRIVACY_REQUEST_RECEIVED'].includes(incoming.notification.notificationType)) return;
    seen.current = incoming.recipientId;
    const presentation = getNotificationPresentation(incoming.notification, t);
    const isCapacity = incoming.notification.notificationType === 'SYSTEM_CAPACITY_ALERT';
    const fallbackPath = incoming.notification.notificationType === 'PUBLIC_PROFILE_LEAD' ? '/customer-profile/leads' : incoming.notification.notificationType === 'REGISTRATION_APPROVAL_REQUIRED' ? '/users/registration-requests' : incoming.notification.notificationType === 'PRIVACY_REQUEST_RECEIVED' ? '/privacy-requests' : '/system-capacity';
    void (isCapacity ? feedback.warning : feedback.info)({ title: presentation.title, message: presentation.message, dedupeKey: `${incoming.notification.notificationType}:${incoming.recipientId}`, duration: isCapacity ? 10000 : 6500, nextAction: { label: t('common.open'), onClick: () => navigate(incoming.notification.actionUrl || fallbackPath) } });
  }, [incoming, navigate, t]);
  return null;
}
