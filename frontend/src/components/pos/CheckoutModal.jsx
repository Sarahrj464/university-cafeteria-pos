import { useState, useRef, useEffect } from "react";
import {
  X,
  CreditCard,
  Banknote,
  GraduationCap,
  Smartphone,
  QrCode,
  Printer,
  CheckCircle,
  Loader2,
  Split,
  FileText,
  Mail,
  AlertCircle,
} from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import Button from "../ui/Button";
import { useToast } from "../../hooks/useToast";
import { getMealPlan, getWalletBalance } from "../../services/meal-plans";
import { processPayment, processSplitPayment } from "../../services/payments";
import { createOrder, emailReceipt } from "../../services/orders";
import Receipt from "./Receipt";
import StudentIDScanner from "../StudentIDScanner";
import { formatCurrency } from "../../utils/currency";
import {
  buildReceiptHtml,
  printOrderReceipt,
  sendReceiptEmail,
} from "../../utils/receiptHtml";

function getRemaining(mp) {
  if (!mp) return 0;
  return parseFloat(mp.remainingCredits ?? mp.remaining_credits ?? 0);
}

function getPlanLabel(type) {
  const labels = {
    unlimited: "Unlimited",
    "14_meal": "14-Meal Plan",
    "7_meal": "7-Meal Plan",
    block_50: "Block 50",
    dining_dollars: "PKR Balance",
  };
  return labels[type] || type;
}

export default function CheckoutModal({ isOpen, onClose, cart, cashierName }) {
  const toast = useToast();

  // Semantic step state instead of numeric
  const [checkoutStep, setCheckoutStep] = useState("scan-student"); // 'scan-student' | 'select-payment' | 'processing' | 'success'

  const [paymentMethod, setPaymentMethod] = useState("");
  const [amountTendered, setAmountTendered] = useState("");
  const [amountTenderedError, setAmountTenderedError] = useState("");

  const [mealPlan, setMealPlan] = useState(null);
  const [walletBalance, setWalletBalance] = useState(null);
  const [mealPlanLoading, setMealPlanLoading] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);

  const [orderResponse, setOrderResponse] = useState(null);
  const [receiptCart, setReceiptCart] = useState(null);

  const [isSplit, setIsSplit] = useState(false);
  const [splitMethod1, setSplitMethod1] = useState("");
  const [splitAmount1, setSplitAmount1] = useState("");
  const [splitMethod2, setSplitMethod2] = useState("");
  const [splitError, setSplitError] = useState("");

  const [lookupId, setLookupId] = useState(cart.studentId || "");
  const [studentInfo, setStudentInfo] = useState(null);
  const [processingLabel, setProcessingLabel] = useState(
    "Processing Payment...",
  );

  const [emailInput, setEmailInput] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [printing, setPrinting] = useState(false);

  const receiptRef = useRef();

  const activeReceiptCart = receiptCart || cart;

  // Validation for each payment method
  const validatePaymentMethod = () => {
    if (isSplit) {
      const p1 = parseFloat(splitAmount1 || 0);
      const p2 = cart.total - p1;

      if (!splitMethod1 || !splitMethod2) {
        setSplitError("Please select two payment methods");
        return false;
      }
      if (splitMethod1 === splitMethod2) {
        setSplitError("Please select two different payment methods");
        return false;
      }
      if (isNaN(p1) || p1 <= 0 || p1 >= cart.total) {
        setSplitError(
          `Method 1 amount must be between 0 and ${formatCurrency(cart.total)}`,
        );
        return false;
      }

      // Validate meal plan / wallet for each split method
      if (splitMethod1 === "meal_plan" || splitMethod2 === "meal_plan") {
        const mealMethodAmount = splitMethod1 === "meal_plan" ? p1 : p2;
        if (!mealPlan || getRemaining(mealPlan) < mealMethodAmount) {
          setSplitError(
            `Insufficient meal plan balance for ${formatCurrency(mealMethodAmount)}`,
          );
          return false;
        }
      }

      if (
        splitMethod1 === "campus_wallet" ||
        splitMethod2 === "campus_wallet"
      ) {
        const walletMethodAmount = splitMethod1 === "campus_wallet" ? p1 : p2;
        if (!walletBalance || walletBalance < walletMethodAmount) {
          setSplitError(
            `Insufficient wallet balance for ${formatCurrency(walletMethodAmount)}`,
          );
          return false;
        }
      }

      setSplitError("");
      return true;
    } else {
      // Non-split validation
      if (!paymentMethod) {
        toast.error("Please select a payment method");
        return false;
      }

      switch (paymentMethod) {
        case "cash": {
          const tendered = parseFloat(amountTendered || 0);
          if (isNaN(tendered) || tendered <= 0) {
            setAmountTenderedError("Please enter an amount");
            return false;
          }
          if (tendered < Math.ceil(cart.total) - 1)  {
            setAmountTenderedError(
              `Insufficient amount. Need at least ${formatCurrency(cart.total)}`,
            );
            return false;
          }
          setAmountTenderedError("");
          return true;
        }

        case "card":
        case "qr_upi":
          return true; // No special validation

        case "meal_plan":
          if (!mealPlan || getRemaining(mealPlan) < cart.total) {
            toast.error("Insufficient meal plan balance");
            return false;
          }
          return true;

        case "campus_wallet":
          if (!walletBalance || walletBalance < cart.total) {
            toast.error("Insufficient wallet balance");
            return false;
          }
          return true;

        default:
          return false;
      }
    }
  };

  const handleNewOrder = () => {
    cart.clearCart();
    setCheckoutStep("scan-student");
    setPaymentMethod("");
    setAmountTendered("");
    setAmountTenderedError("");
    setMealPlan(null);
    setWalletBalance(null);
    setOrderResponse(null);
    setReceiptCart(null);
    setIsSplit(false);
    setSplitMethod1("");
    setSplitAmount1("");
    setSplitMethod2("");
    setSplitError("");
    setLookupId("");
    setStudentInfo(null);
    setEmailInput("");
    onClose();
  };

  const handleDownloadPdf = async () => {
    try {
      let target = receiptRef.current;

      if (!target) {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = buildReceiptHtml(
          orderResponse,
          activeReceiptCart,
          cashierName,
        );
        wrapper.style.position = "fixed";
        wrapper.style.left = "-9999px";
        document.body.appendChild(wrapper);
        target = wrapper;
      }

      const canvas = await html2canvas(target, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      if (target.parentElement === document.body) {
        document.body.removeChild(target);
      }

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pageWidth - 16;
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, "PNG", 8, 8, pdfWidth, pdfHeight);
      pdf.save(
        `receipt-${orderResponse?.orderNumber || orderResponse?.id || "receipt"}.pdf`,
      );
    } catch (err) {
      toast.error("Failed to generate PDF");
      console.error(err);
    }
  };

  const handleEmailReceipt = async () => {
    const trimmedEmail = emailInput.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Client-side validation before hitting the API
    if (!trimmedEmail) {
      console.warn("[handleEmailReceipt] Aborted: email input is empty.");
      toast.error("Please enter an email address");
      return;
    }
    if (!emailRegex.test(trimmedEmail)) {
      console.warn(
        "[handleEmailReceipt] Aborted: invalid email format:",
        trimmedEmail,
      );
      toast.error("Please enter a valid email address (e.g. user@example.com)");
      return;
    }
    if (!orderResponse?.id) {
      console.error(
        "[handleEmailReceipt] Aborted: orderResponse.id is missing.",
        orderResponse,
      );
      toast.error("Order details are missing. Cannot send receipt.");
      return;
    }

    console.log("[handleEmailReceipt] Sending receipt email to:", trimmedEmail);
    setEmailSending(true);
    try {
      await sendReceiptEmail({
        order: orderResponse,
        cart: activeReceiptCart,
        cashierName,
        email: trimmedEmail,
        emailReceiptApi: emailReceipt,
        toast,
      });
    } finally {
      setEmailSending(false);
    }
  };

  const handlePrintReceipt = () => {
    console.log(
      "[handlePrintReceipt] Triggering DOM-injection print for order:",
      orderResponse?.orderNumber || orderResponse?.id,
    );
    setPrinting(true);
    try {
      printOrderReceipt({
        order: orderResponse,
        cart: activeReceiptCart,
        cashierName,
        toast,
      });
    } finally {
      setTimeout(() => setPrinting(false), 500);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCheckoutStep("scan-student");
      setPaymentMethod("");
      setAmountTendered("");
      setAmountTenderedError("");
      setMealPlan(null);
      setWalletBalance(null);
      setOrderResponse(null);
      setReceiptCart(null);
      setIsSplit(false);
      setSplitMethod1("");
      setSplitAmount1("");
      setSplitMethod2("");
      setSplitError("");
      setLookupId(cart.studentId || "");
      setStudentInfo(null);
      setProcessingLabel("Processing Payment...");
      setEmailInput("");
    }
  }, [isOpen]);

  const activeStudentId = lookupId.trim() || cart.studentId?.trim();
  const resolvedStudentIdForPayment =
    (lookupId || cart.studentId || "").trim() || null;

  const handleStudentFound = (studentResult) => {
    if (!studentResult) {
      setStudentInfo(null);
      setMealPlan(null);
      setWalletBalance(null);
      setPaymentMethod((method) => (method === "meal_plan" ? "" : method));
      return;
    }

    const mealPlanPayload = {
      studentName: studentResult.studentName,
      planType: studentResult.planType,
      remainingCredits: studentResult.remainingCredits,
      expiresAt: studentResult.expiresAt,
      studentId: studentResult.studentId,
    };

    setStudentInfo({
      name: studentResult.studentName,
      planType: studentResult.planType,
      remaining: studentResult.remainingCredits,
      walletBalance: studentResult.walletBalance || 0,
      expiresAt: studentResult.expiresAt,
    });
    setMealPlan(mealPlanPayload);
    setWalletBalance(studentResult.walletBalance || 0);
    setLookupId(studentResult.studentId);
    cart.setStudentId(studentResult.studentId);

    if (studentResult.sufficient) {
      setPaymentMethod("meal_plan");
    }
  };

  if (!isOpen) return null;

  const handleSelectMethod = (method) => {
    if (method === "split") {
      setIsSplit(true);
      setPaymentMethod("");
      setSplitError("");
      return;
    }

    setIsSplit(false);
    setPaymentMethod(method);
    setAmountTenderedError("");
    setSplitError("");

    if (method === "meal_plan") {
      fetchMealPlan();
    } else if (method === "campus_wallet") {
      fetchWalletBalance();
    }
  };

  const fetchMealPlan = async () => {
    if (!activeStudentId) {
      toast.error("Please look up a Student ID first.");
      return;
    }
    setMealPlanLoading(true);
    try {
      const mp = await getMealPlan(activeStudentId);
      setMealPlan(mp);
    } catch (err) {
      toast.error("Meal plan not found or inactive");
      setPaymentMethod("");
    } finally {
      setMealPlanLoading(false);
    }
  };

  const fetchWalletBalance = async () => {
    if (!activeStudentId) {
      toast.error("Please look up a Student ID first.");
      return;
    }
    setWalletLoading(true);
    try {
      const balance = await getWalletBalance(activeStudentId);
      setWalletBalance(balance);
    } catch (err) {
      toast.error("Wallet balance not available");
      setPaymentMethod("");
    } finally {
      setWalletLoading(false);
    }
  };

  const processOrderAndPayment = async () => {
    setCheckoutStep("processing");

    // Capture cart snapshot early for receipt
    const receiptCartSnapshot = {
      ...cart,
      items: cart.items.map((item) => ({ ...item })),
    };
    setReceiptCart(receiptCartSnapshot);

    console.log("[CheckoutModal] processOrderAndPayment start", {
      paymentMethod,
      isSplit,
      amountTendered,
      cartTotal: cart?.total,
      studentId: activeStudentId,
    });

    try {
      const orderData = {
        items: cart.items.map((i) => ({
          menuItemId: i.menuItemId,
          name: i.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          modifiers: i.modifiers,
          subtotal: parseFloat((i.unitPrice * i.quantity).toFixed(2)),
        })),
        subtotal: cart.subtotal,
        discountAmount: cart.discountAmount,
        taxAmount: cart.taxAmount,
        totalAmount: cart.total,
        notes: cart.orderNote || null,
        studentId: activeStudentId || null,
        status: "pending",
      };

      if (!navigator.onLine) {
        const { savePendingOrder } = await import("../../utils/indexedDb");
        const offlineOrder = {
          ...orderData,
          paymentMethod: isSplit ? "split" : paymentMethod,
          isSplit,
          splitMethod1: isSplit ? splitMethod1 : null,
          splitAmount1: isSplit ? parseFloat(splitAmount1) : null,
          splitMethod2: isSplit ? splitMethod2 : null,
        };
        const savedOrder = await savePendingOrder(offlineOrder);
        const offlineOrderResponse = {
          id: savedOrder.offlineId,
          orderNumber: `OFF-${Date.now().toString().slice(-6)}`,
          status: "pending",
          subtotal: cart.subtotal,
          discountAmount: cart.discountAmount,
          taxAmount: cart.taxAmount,
          totalAmount: cart.total,
          paymentMethod: isSplit ? "split" : paymentMethod,
          notes: cart.orderNote || null,
          createdAt: savedOrder.createdAt,
          items: orderData.items,
          amountTendered:
            paymentMethod === "cash" ? parseFloat(amountTendered) : undefined,
          changeDue:
            paymentMethod === "cash"
              ? Math.max(0, parseFloat(amountTendered) - cart.total)
              : undefined,
        };
        setOrderResponse(offlineOrderResponse);
        setReceiptCart(receiptCartSnapshot);
        setCheckoutStep("success");
        toast.success("Order saved offline!");
        cart.clearCart();
        return;
      }

      const order = await createOrder(orderData);
      console.log("[CheckoutModal] order created", {
        orderId: order?.id,
        orderNumber: order?.orderNumber || order?.order_number,
      });

      const studentIdForPayment =
        paymentMethod === "meal_plan" || paymentMethod === "campus_wallet"
          ? activeStudentId
          : null;

      let receiptOrder = null;

      if (isSplit) {
        const p1Amt = parseFloat(splitAmount1);
        const p2Amt = cart.total - p1Amt;

        if (splitMethod1 === "card" || splitMethod2 === "card") {
          setProcessingLabel("Swipe/Tap Card...");
          await new Promise((r) => setTimeout(r, 2000));
        }

        const paymentRes = await processSplitPayment({
          orderId: order.id,
          payments: [
            { method: splitMethod1, amount: p1Amt },
            { method: splitMethod2, amount: p2Amt },
          ],
          studentId:
            splitMethod1 === "meal_plan" ||
            splitMethod1 === "campus_wallet" ||
            splitMethod2 === "meal_plan" ||
            splitMethod2 === "campus_wallet"
              ? activeStudentId
              : null,
        });

        receiptOrder = paymentRes.order;
      } else {
        if (paymentMethod === "card") {
          setProcessingLabel("Swipe/Tap Card...");
          await new Promise((r) => setTimeout(r, 2000));
        }

        const paymentRes = await processPayment({
          orderId: order.id,
          paymentMethod,
          amount: cart.total,
          transactionRef:
            paymentMethod === "card"
              ? `TXN-${Math.floor(Math.random() * 1000000)}`
              : null,
          studentId: studentIdForPayment,
        });

        receiptOrder = {
          ...paymentRes.order,
          amountTendered:
            paymentMethod === "cash" ? parseFloat(amountTendered) : undefined,
          changeDue:
            paymentMethod === "cash"
              ? Math.max(0, parseFloat(amountTendered) - cart.total)
              : undefined,
        };
      }

      setOrderResponse(receiptOrder);
      setReceiptCart(receiptCartSnapshot);

      // This is the critical line - set success state and never revert
      setCheckoutStep("success");

      console.log("[CheckoutModal] Success! Step set to 'success'", {
        orderId: receiptOrder?.id,
        orderNumber: receiptOrder?.orderNumber || receiptOrder?.order_number,
        paymentMethod,
      });

      toast.success("Payment successful!");
      cart.clearCart();
    } catch (err) {
      console.error("[CheckoutModal] Payment error:", err);
      toast.error(
        err.response?.data?.message || err.message || "Payment failed",
      );
      // Revert to select-payment step on error
      setCheckoutStep("select-payment");
    }
  };

  const handleConfirmPayment = () => {
    console.log("[CheckoutModal] handleConfirmPayment", {
      paymentMethod,
      isSplit,
      amountTendered,
      splitMethod1,
      splitAmount1,
      splitMethod2,
    });

    if (!validatePaymentMethod()) {
      return; // Validation failed, errors already set
    }

    processOrderAndPayment();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-cream shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-forest/10 bg-forest p-4 text-cream">
          <h2 className="text-xl font-bold">Checkout</h2>
          {checkoutStep !== "processing" && (
            <button
              onClick={onClose}
              className="rounded-full p-1 hover:bg-forest-light transition-colors"
            >
              <X size={24} />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-cream text-forest">
          {checkoutStep === "scan-student" && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold">Order Summary</h3>
              <div className="space-y-3 bg-white p-4 rounded-xl border border-forest/10 shadow-sm">
                {cart.items.map((item) => (
                  <div
                    key={item.lineId}
                    className="flex justify-between font-medium"
                  >
                    <span>
                      {item.quantity}x {item.name}
                    </span>
                    <span>
                      {formatCurrency(item.unitPrice * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="space-y-2 text-right">
                <p>Subtotal: {formatCurrency(cart.subtotal)}</p>
                {cart.discountAmount > 0 && (
                  <p className="text-success">
                    Discount: -{formatCurrency(cart.discountAmount)}
                  </p>
                )}
                <p>Tax (5%): {formatCurrency(cart.taxAmount)}</p>
                <p className="text-2xl font-bold text-accent pt-2 border-t border-forest/20 mt-2">
                  Total: {formatCurrency(cart.total)}
                </p>
              </div>
              <StudentIDScanner
                onStudentFound={handleStudentFound}
                orderTotal={cart.total}
                initialStudentId={lookupId}
              />

              {studentInfo && (
                <div className="rounded-xl border border-forest/20 bg-white p-4">
                  <p className="font-bold mb-2">{studentInfo.name}</p>
                  <div className="space-y-1 text-sm text-forest/70">
                    <p>
                      <span className="font-semibold text-forest">
                        Meal Plan Balance:
                      </span>{" "}
                      {formatCurrency(studentInfo.remaining)}
                    </p>
                    <p>
                      <span className="font-semibold text-forest">
                        Wallet Balance:
                      </span>{" "}
                      {formatCurrency(studentInfo.walletBalance)}
                    </p>
                  </div>
                </div>
              )}

              <Button
                variant="accent"
                className="w-full py-4 text-lg"
                onClick={() => setCheckoutStep("select-payment")}
              >
                Proceed to Payment
              </Button>
            </div>
          )}

          {checkoutStep === "select-payment" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold">Select Payment Method</h3>
                <span className="text-2xl font-bold text-accent">
                  {formatCurrency(cart.total)}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <MethodButton
                  icon={<Banknote size={32} />}
                  label="Cash"
                  onClick={() => handleSelectMethod("cash")}
                  active={paymentMethod === "cash" && !isSplit}
                />
                <MethodButton
                  icon={<CreditCard size={32} />}
                  label="Card"
                  onClick={() => handleSelectMethod("card")}
                  active={paymentMethod === "card" && !isSplit}
                />
                <MethodButton
                  icon={<GraduationCap size={32} />}
                  label="Meal Plan"
                  onClick={() => handleSelectMethod("meal_plan")}
                  active={paymentMethod === "meal_plan" && !isSplit}
                />
                <MethodButton
                  icon={<Smartphone size={32} />}
                  label="Wallet"
                  onClick={() => handleSelectMethod("campus_wallet")}
                  active={paymentMethod === "campus_wallet" && !isSplit}
                />
                <MethodButton
                  icon={<QrCode size={32} />}
                  label="QR/UPI"
                  onClick={() => handleSelectMethod("qr_upi")}
                  active={paymentMethod === "qr_upi" && !isSplit}
                />
                <MethodButton
                  icon={<Split size={32} />}
                  label="Split Pay"
                  onClick={() => handleSelectMethod("split")}
                  active={isSplit}
                />
              </div>

              {!isSplit && paymentMethod === "meal_plan" && mealPlan && (
                <div className="rounded-xl border border-forest/20 bg-white p-4">
                  <p className="font-bold">
                    {mealPlan.studentName || "Student"}
                  </p>
                  <p className="text-sm text-forest/70">
                    Plan:{" "}
                    {getPlanLabel(mealPlan.planType ?? mealPlan.plan_type)}
                  </p>
                  <p className="text-lg font-bold text-accent">
                    Balance: {formatCurrency(getRemaining(mealPlan))}
                  </p>
                  {getRemaining(mealPlan) < cart.total && (
                    <p className="mt-2 text-sm font-semibold text-error flex items-center gap-2">
                      <AlertCircle size={16} />
                      Insufficient balance for this order
                    </p>
                  )}
                </div>
              )}

              {!isSplit &&
                paymentMethod === "campus_wallet" &&
                walletBalance !== null && (
                  <div className="rounded-xl border border-forest/20 bg-white p-4">
                    <p className="text-sm text-forest/70 mb-1">
                      Campus Wallet Balance
                    </p>
                    <p className="text-lg font-bold text-accent">
                      {formatCurrency(walletBalance)}
                    </p>
                    {walletBalance < cart.total && (
                      <p className="mt-2 text-sm font-semibold text-error flex items-center gap-2">
                        <AlertCircle size={16} />
                        Insufficient balance for this order
                      </p>
                    )}
                  </div>
                )}

              {!isSplit && paymentMethod === "cash" && (
                <div className="bg-white p-6 rounded-xl border border-forest/20 mt-6 shadow-sm animate-fade-in">
                  <label className="block text-sm font-bold mb-2">
                    Amount Tendered (PKR)
                  </label>
                  <input
                    type="number"
                    value={amountTendered}
                    min="0"
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (isNaN(val) || val < 0) {
                        setAmountTendered("");
                      } else {
                        setAmountTendered(e.target.value);
                      }
                      setAmountTenderedError("");
                    }}
                    onWheel={(e) => e.target.blur()}
                    onKeyDown={(e) => {
                      if (e.key === "-" || e.key === "e" || e.key === "E") {
                        e.preventDefault();
                      }
                    }}
                    style={{
                      MozAppearance: "textfield",
                    }}
                    className={`w-full text-3xl p-4 rounded-xl border-2 outline-none mb-4 font-mono [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                      amountTenderedError
                        ? "border-error focus:border-error"
                        : "border-forest focus:border-accent"
                    }`}
                    placeholder="0.00"
                    autoFocus
                  />
                  {amountTenderedError && (
                    <div className="text-sm font-semibold text-error mb-4 flex items-center gap-2">
                      <AlertCircle size={16} />
                      {amountTenderedError}
                    </div>
                  )}
                  {amountTendered &&
                    parseFloat(amountTendered) >= cart.total && (
                      <div className="text-lg bg-forest/5 p-4 rounded-lg flex justify-between items-center">
                        <span className="font-bold">Change Due:</span>
                        <span className="text-2xl font-bold text-success">
                          {formatCurrency(
                            parseFloat(amountTendered) - cart.total,
                          )}
                        </span>
                      </div>
                    )}
                </div>
              )}

              {isSplit && (
                <div className="bg-white p-6 rounded-xl border border-forest/20 mt-6 shadow-sm animate-fade-in space-y-4">
                  <h4 className="font-bold text-lg mb-2">
                    Split Payment Details
                  </h4>

                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm mb-1 text-forest/70">
                        Method 1
                      </label>
                      <select
                        value={splitMethod1}
                        onChange={(e) => {
                          setSplitMethod1(e.target.value);
                          setSplitError("");
                          if (e.target.value === "meal_plan") {
                            fetchMealPlan();
                          } else if (e.target.value === "campus_wallet") {
                            fetchWalletBalance();
                          }
                        }}
                        className="w-full p-3 rounded-lg border border-forest/20 bg-forest-light/10 focus:outline-none focus:border-accent"
                      >
                        <option value="">Select Method...</option>
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="meal_plan">Meal Plan</option>
                        <option value="campus_wallet">Wallet</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm mb-1 text-forest/70">
                        Amount (PKR)
                      </label>
                      <input
                        type="number"
                        value={splitAmount1}
                        onChange={(e) => {
                          setSplitAmount1(e.target.value);
                          setSplitError("");
                        }}
                        className="w-full p-3 rounded-lg border border-forest/20 bg-forest-light/10 focus:outline-none focus:border-accent"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {splitError && (
                    <div className="text-sm font-semibold text-error flex items-center gap-2 bg-error/5 p-3 rounded-lg border border-error/20">
                      <AlertCircle size={16} />
                      {splitError}
                    </div>
                  )}

                  {splitAmount1 &&
                    parseFloat(splitAmount1) > 0 &&
                    parseFloat(splitAmount1) < cart.total && (
                      <div className="flex gap-4 border-t border-forest/10 pt-4 mt-4">
                        <div className="flex-1">
                          <label className="block text-sm mb-1 text-forest/70">
                            Method 2
                          </label>
                          <select
                            value={splitMethod2}
                            onChange={(e) => {
                              setSplitMethod2(e.target.value);
                              setSplitError("");
                              if (e.target.value === "meal_plan") {
                                fetchMealPlan();
                              } else if (e.target.value === "campus_wallet") {
                                fetchWalletBalance();
                              }
                            }}
                            className="w-full p-3 rounded-lg border border-forest/20 bg-forest-light/10 focus:outline-none focus:border-accent"
                          >
                            <option value="">Select Method...</option>
                            <option value="cash">Cash</option>
                            <option value="card">Card</option>
                            <option value="meal_plan">Meal Plan</option>
                            <option value="campus_wallet">Wallet</option>
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="block text-sm mb-1 text-forest/70">
                            Remaining (PKR)
                          </label>
                          <div className="w-full p-3 rounded-lg border border-forest/20 bg-forest/5 font-bold text-lg">
                            {formatCurrency(
                              cart.total - parseFloat(splitAmount1 || 0),
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                  {mealPlan &&
                    (splitMethod1 === "meal_plan" ||
                      splitMethod2 === "meal_plan") && (
                      <div className="rounded-lg border border-forest/20 bg-forest-light/5 p-3">
                        <p className="text-sm text-forest/70 mb-1">
                          Meal Plan Balance
                        </p>
                        <p className="text-lg font-bold text-accent">
                          {formatCurrency(getRemaining(mealPlan))}
                        </p>
                      </div>
                    )}

                  {walletBalance !== null &&
                    (splitMethod1 === "campus_wallet" ||
                      splitMethod2 === "campus_wallet") && (
                      <div className="rounded-lg border border-forest/20 bg-forest-light/5 p-3">
                        <p className="text-sm text-forest/70 mb-1">
                          Wallet Balance
                        </p>
                        <p className="text-lg font-bold text-accent">
                          {formatCurrency(walletBalance)}
                        </p>
                      </div>
                    )}
                </div>
              )}

              <div className="flex gap-4 pt-4 border-t border-forest/10 mt-6">
                <Button
                  variant="outline"
                  className="flex-1 py-4 text-lg"
                  onClick={() => setCheckoutStep("scan-student")}
                >
                  Back
                </Button>
                <Button
                  variant="accent"
                  className="flex-[2] py-4 text-lg"
                  disabled={
                    checkoutStep === "processing" ||
                    (!isSplit &&
                      (!paymentMethod ||
                        (paymentMethod === "cash" &&
                          (!amountTendered ||
                            parseFloat(amountTendered) < Math.ceil(cart.total) - 1))))
                  }
                  onClick={handleConfirmPayment}
                >
                  Confirm Payment
                </Button>
              </div>
            </div>
          )}

          {checkoutStep === "processing" && (
            <div className="flex flex-col items-center justify-center py-20 space-y-6">
              {processingLabel.includes("Card") ? (
                <CreditCard className="animate-pulse text-accent" size={80} />
              ) : (
                <Loader2 className="animate-spin text-accent" size={64} />
              )}
              <h3 className="text-2xl font-bold">{processingLabel}</h3>
            </div>
          )}

          {checkoutStep === "success" && orderResponse && (
            <div className="flex flex-col items-center justify-center py-10 space-y-6 animate-fade-in text-center">
              <CheckCircle className="text-success" size={80} />
              <h2 className="text-3xl font-bold text-forest">
                Payment Successful!
              </h2>
              <div className="bg-white p-6 rounded-2xl border-2 border-dashed border-forest/20 w-full max-w-sm">
                <p className="text-forest/60 mb-1">Order Number</p>
                <p className="text-4xl font-mono font-bold text-accent">
                  {orderResponse.orderNumber || orderResponse.order_number}
                </p>
              </div>
              <div className="flex w-full max-w-sm gap-2">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleEmailReceipt();
                    }
                  }}
                  placeholder="Email for receipt"
                  className="min-h-[48px] flex-1 rounded-lg border border-forest/20 px-3 text-sm"
                  disabled={emailSending}
                />
                <Button
                  variant="primary"
                  onClick={handleEmailReceipt}
                  disabled={emailSending || !emailInput.trim()}
                  className="min-h-[48px] gap-2"
                >
                  {emailSending ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Mail size={18} />
                  )}
                  {emailSending ? "Sending..." : "Email"}
                </Button>
              </div>
              <div className="flex w-full max-w-sm gap-4 mt-8">
                <Button
                  variant="outline"
                  className="flex-1 py-4 flex flex-col items-center gap-2 h-auto"
                  onClick={handlePrintReceipt}
                  disabled={printing}
                >
                  {printing ? (
                    <Loader2 size={24} className="animate-spin" />
                  ) : (
                    <Printer size={24} />
                  )}
                  <span>{printing ? "Printing..." : "Print Receipt"}</span>
                </Button>
                <Button
                  variant="primary"
                  className="flex-1 py-4 flex flex-col items-center gap-2 h-auto"
                  onClick={handleDownloadPdf}
                >
                  <FileText size={24} />
                  <span>Download PDF</span>
                </Button>
              </div>
              <div className="flex w-full max-w-sm gap-4 mt-4">
                <Button
                  variant="accent"
                  className="flex-1 py-4 text-lg"
                  onClick={handleNewOrder}
                >
                  New Order
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 py-4 text-lg"
                  onClick={onClose}
                >
                  Close
                </Button>
              </div>
              <div
                className="pointer-events-none fixed -left-[9999px] top-0"
                aria-hidden="true"
              >
                <Receipt
                  ref={receiptRef}
                  order={orderResponse}
                  cart={activeReceiptCart}
                  cashierName={cashierName}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MethodButton({ icon, label, onClick, active }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all ${
        active
          ? "border-2 border-[#E76F00] bg-[#E76F00]/10 text-[#E76F00] scale-105 shadow-md shadow-orange-200/50"
          : "border-2 border-forest/10 bg-white text-forest hover:border-[#E76F00]/50 hover:bg-[#E76F00]/5 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 active:scale-95"
      }`}
    >
      <div className="mb-3">{icon}</div>
      <span className="font-bold">{label}</span>
    </button>
  );
}
