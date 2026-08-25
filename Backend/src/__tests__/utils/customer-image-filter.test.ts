import { isMissingCustomerImage, missingCustomerImageSql } from '../../utils/customer-image-filter';

describe('customer image filter contract', () => {
  it.each([null, '', undefined])('treats %p as missing', value => {
    expect(isMissingCustomerImage(value)).toBe(true);
  });

  it.each(['https://cdn.example.test/customer.jpg', '0'])('keeps %s as present', value => {
    expect(isMissingCustomerImage(value)).toBe(false);
  });

  it('uses one SQL predicate shape for list and analytics aliases', () => {
    expect(missingCustomerImageSql('customer')).toBe("(customer.customerImageUrl IS NULL OR customer.customerImageUrl = '')");
    expect(missingCustomerImageSql('c')).toBe("(c.customerImageUrl IS NULL OR c.customerImageUrl = '')");
  });
});
