import {
  DELIVERY_MAX_ATTEMPTS,
  calculateDeliveryBackoffMinutes,
  deliveryFailureStatus,
} from '../../services/outbox.service';

describe('delivery reliability policy', () => {
  it('uses bounded exponential backoff', () => {
    expect(calculateDeliveryBackoffMinutes(1)).toBe(2);
    expect(calculateDeliveryBackoffMinutes(4)).toBe(16);
    expect(calculateDeliveryBackoffMinutes(50)).toBe(256);
    expect(calculateDeliveryBackoffMinutes(50)).toBeLessThanOrEqual(360);
  });

  it('moves a delivery to dead letter at the bounded attempt limit', () => {
    expect(deliveryFailureStatus(DELIVERY_MAX_ATTEMPTS - 1)).toBe('failed');
    expect(deliveryFailureStatus(DELIVERY_MAX_ATTEMPTS)).toBe('dead');
    expect(deliveryFailureStatus(DELIVERY_MAX_ATTEMPTS + 1)).toBe('dead');
  });
});
