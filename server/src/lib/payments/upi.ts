type UpiQrParams = {
  vpa: string;
  payeeName: string;
  amount: number;
  transactionNote: string;
};

export const buildUpiPaymentString = ({
  vpa,
  payeeName,
  amount,
  transactionNote,
}: UpiQrParams): string => {
  const params = new URLSearchParams({
    pa: vpa.trim(),
    pn: payeeName.trim(),
    am: amount.toFixed(2),
    cu: "INR",
    tn: transactionNote.trim(),
  });
  return `upi://pay?${params.toString()}`;
};
