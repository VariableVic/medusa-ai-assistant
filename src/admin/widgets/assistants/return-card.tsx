import { formatAmount } from "medusa-react";
import { Badge, Button, Container, Text } from "@medusajs/ui";
import { CheckMini } from "@medusajs/icons";
import {
  Order,
  ReturnItem,
  ReturnReason,
  ShippingOption,
} from "@medusajs/medusa";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

type ReturnCardProps = {
  id: string;
  args: Record<string, any>;
  shipping_options: ShippingOption[];
  return_reasons: ReturnReason[];
  order: Order;
  handleReturnConfirmation: () => void;
  createReturnLoading: boolean;
  returnCreated: boolean;
  containerRef: React.MutableRefObject<HTMLDivElement>;
};

const ReturnCard = ({
  args,
  shipping_options,
  return_reasons,
  order,
  handleReturnConfirmation,
  createReturnLoading,
  returnCreated,
  containerRef,
}: ReturnCardProps) => {
  const [returnCardData, setReturnCardData] = useState(null);

  // Parse items into return card data
  const parseItems = (
    obj: Record<string, any>
  ): {
    id: string;
    quantity: number;
    unit_price: number;
    title: string;
    total: number;
    thumbnail: string;
    reason: string;
    variant: string;
  }[] => {
    const itemsWithoutReturnReasonId = (obj as ReturnItem[]).filter(
      (i) => !i.reason_id
    );

    if (itemsWithoutReturnReasonId.length) {
      return;
    }

    return obj.map((i) => {
      const item = order.items.find((item) => item.id === i.item_id);

      const return_reason = return_reasons.find(
        (reason) => reason.id === i.reason_id
      );

      return {
        id: i.item_id,
        quantity: i.quantity,
        title: item.title,
        total: i.quantity * item.unit_price,
        unit_price: item.unit_price,
        thumbnail: item.thumbnail,
        reason: return_reason?.label,
        variant: item.variant?.title,
      };
    });
  };

  // Parse shipping option into return card data
  const parseShipping = (
    obj: Record<string, any>
  ): { shipping_option: string; shipping_cost: number } => {
    if (!obj.option_id) return;

    const shipping_option = shipping_options.find(
      (option) => option.id === obj.option_id
    );

    return {
      shipping_option: shipping_option?.name,
      shipping_cost: obj.price,
    };
  };

  // Handle return card data
  const handleReturnCard = (args: Record<string, any>) => {
    if (!args.items || !args.return_shipping) return;
    const items = parseItems(args.items);
    const shipping = parseShipping(args.return_shipping);

    if (!items || !shipping || !shipping.shipping_option) return;

    const refund = args.refund - shipping.shipping_cost;

    return { items, shipping, refund };
  };

  useEffect(() => {
    if (!args) return;
    setReturnCardData(handleReturnCard(args));
  }, [args]);

  if (!returnCardData) return null;

  const { items, shipping, refund } = returnCardData;

  return (
    <motion.div
      className="flex md:w-5/12 w-[50%] max-w-[90%] self-end"
      onAnimationComplete={() => {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.3,
        delay: 0.2,
        ease: [0, 0.71, 0.2, 1.01],
        out: { duration: 0.3, ease: [0.71, 0, 1.01, 0] },
      }}
    >
      <Container className="flex flex-col gap-4 p-4">
        <Text className="font-semibold">Return overview</Text>
        {items.map((i) => (
          <div className="mb-base flex flex-col last:mb-" key={i.id}>
            <div className="gap-x-small flex items-center">
              <div className="rounded-base h-10 w-[30px] overflow-hidden">
                <img
                  src={i.thumbnail}
                  alt={`Thumbnail for ${i.title}`}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="inter-small-regular flex w-full flex-col">
                <div className="flex w-full items-center justify-between">
                  <p>{i.title}</p>
                  <p className="text-grey-50">
                    {formatAmount({
                      amount: i.unit_price,
                      region: order.region,
                    })}
                  </p>
                  <span className="inter-small-semibold text-violet-60">
                    x{i.quantity}
                  </span>
                </div>
                <p className="text-grey-50">{i.variant}</p>
                <p className="text-grey-50">{i.reason}</p>
              </div>
            </div>
          </div>
        ))}
        <div className="flex flex-col gap-1">
          <Text className="inter-small-regular">
            <span className="inter-small-semibold">Shipping method:</span>{" "}
            <span>{shipping.shipping_option}</span>
          </Text>
          <Text className="inter-small-regular">
            <span className="inter-small-semibold">Shipping cost:</span>{" "}
            <span>
              {formatAmount({
                amount: shipping.shipping_cost,
                region: order.region,
              })}
            </span>
          </Text>
          <Text className="inter-small-regular">
            <span className="inter-small-semibold">Refund amount</span>{" "}
            <span>
              {formatAmount({
                amount: refund,
                region: order.region,
              })}
            </span>
          </Text>
        </div>
        {returnCreated && (
          <Badge className="pr-4 self-end py-[5px]" color="green">
            <CheckMini />
            Return created
          </Badge>
        )}
        {!returnCreated && (
          <Button
            onClick={handleReturnConfirmation}
            isLoading={createReturnLoading}
            className="self-end"
          >
            Create return
          </Button>
        )}
      </Container>
    </motion.div>
  );
};

export default ReturnCard;
