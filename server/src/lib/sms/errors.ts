export class SmsDeliveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SmsDeliveryError";
  }
}
