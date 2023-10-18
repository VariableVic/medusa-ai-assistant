import type { WidgetConfig, OrderDetailsWidgetProps } from "@medusajs/admin";
import {
  formatAmount,
  useAdminCancelReturn,
  useAdminRequestReturn,
  useAdminReturnReasons,
  useAdminShippingOptions,
} from "medusa-react";
import { Badge, Button, Container, Input, Text } from "@medusajs/ui";
import { useChat } from "ai/react";
import { ArrowDownLeftMini, CheckMini } from "@medusajs/icons";
import {
  ChatRequest,
  FunctionCall,
  FunctionCallHandler,
  Message,
  nanoid,
} from "ai";
import {
  AdminPostOrdersOrderReturnsReq,
  LineItem,
  Order,
  Return,
  ReturnItem,
} from "@medusajs/medusa";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

const backendUrl =
  process.env.MEDUSA_BACKEND_URL === "/"
    ? location.origin
    : process.env.MEDUSA_BACKEND_URL || "http://localhost:9000";

type ReturnCardProps = {
  items: {
    id: string;
    title: string;
    quantity: number;
    total: number;
    unit_price: number;
    thumbnail: string;
    reason: string;
    variant: string;
  }[];
  shipping: {
    shipping_option: string;
    shipping_cost: number;
  };
  order: Order;
  id: string;
  refund: number;
  handleReturnConfirmation: () => void;
  createReturnLoading: boolean;
  returnCreated: boolean;
  containerRef: React.MutableRefObject<HTMLDivElement>;
};

const OrderAssistantWidget = ({ order, notify }: OrderDetailsWidgetProps) => {
  const [returnId, setReturnId] = useState<string | null>(null);
  const [returnApiObject, setReturnApiObject] = useState<Return>(null);
  const [returnsCreated, setReturnsCreated] = useState<string[]>([]);

  // Clean items for GPT
  const cleanItems = order.items.map(
    (item) =>
      ({
        id: item.id,
        title: item.title,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
        thumbnail: item.thumbnail,
        variant: item.variant?.title,
      } as unknown as LineItem)
  );

  // Hook to create return
  const { mutateAsync: requestReturnMutate, isLoading: createReturnLoading } =
    useAdminRequestReturn(order.id);

  // hook to cancel return
  const { mutateAsync: cancelReturnMutate, isLoading: cancelReturnLoading } =
    useAdminCancelReturn(returnId);

  // Hook to get shipping options
  const { shipping_options } = useAdminShippingOptions({
    region_id: order.region_id,
    is_return: true,
  });

  // Hook to get return reasons
  const { return_reasons } = useAdminReturnReasons();

  // Formats the response from the function calls
  const formatFunctionResponse = (
    content: Record<string, any>,
    chatMessages: Message[],
    name: string
  ): ChatRequest => {
    return {
      messages: [
        ...chatMessages,
        {
          id: nanoid(),
          name,
          role: "function" as const,
          content: JSON.stringify(content),
        },
      ],
    };
  };

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

  // Handle function calls from GPT
  const functionCallHandler: FunctionCallHandler = async (
    chatMessages,
    functionCall
  ) => {
    // Handle propose_return function call
    if (functionCall.name === "propose_return") {
      const parsedFunctionCallArguments = JSON.parse(functionCall.arguments);
      const { items, return_shipping } = parsedFunctionCallArguments;
      let content: Record<string, any> = { error: "No arguments provided" };

      try {
        // Check if all items are provided
        if (!items) {
          content = {
            error:
              "No items provided. Here are the available items. Ask the agent to select the items they want to return and call this function again with the selected items",
            items: order.items,
          };

          return formatFunctionResponse(
            content,
            chatMessages,
            functionCall.name
          );
        }
        // Check if all items have a reason id
        const itemsWithoutReturnReasonId = (items as ReturnItem[]).filter(
          (i) => !i.reason_id
        );

        if (itemsWithoutReturnReasonId.length) {
          content = {
            follow_up_question: `No return reason id provided for these items: ${itemsWithoutReturnReasonId
              .map((i) => i.item_id)
              .join()}. Here are the available return reasons. If not mentioned in previous messages, ask the agent to select the reason for the return and call this function again with the selected reason`,
            return_reasons,
          };

          return formatFunctionResponse(
            content,
            chatMessages,
            functionCall.name
          );
        }

        // Check if return shipping option is provided
        if (!return_shipping?.option_id) {
          content = {
            follow_up_question:
              "No return shipping option id provided. Here are the available return shipping options. If not mentioned in previous messages, ask the agent to select the option they want to use and call this function again with the selected option",
            shipping_options,
          };

          return formatFunctionResponse(
            content,
            chatMessages,
            functionCall.name
          );
        }
      } catch (e) {
        console.log({ e });
      }

      // If all checks pass, create the return
      if (parsedFunctionCallArguments) {
        delete parsedFunctionCallArguments.create_return_user_confirmation;
        setReturnApiObject(parsedFunctionCallArguments);
        content = {
          return_proposed:
            "Return proposal sent to the agent. They can now create the return by clicking the button in the card above.",
        };
      }

      return formatFunctionResponse(content, chatMessages, functionCall.name);
    }

    // Handle cancel_return function call
    if (functionCall.name === "cancel_return") {
      let content: Record<string, any> = { error: "No return_id provided" };
      if (functionCall.arguments) {
        const parsedFunctionCallArguments = JSON.parse(functionCall.arguments);
        setReturnId(parsedFunctionCallArguments.return_id);
      }
      if (returnId) {
        content = await cancelReturn();
      }
      return formatFunctionResponse(content, chatMessages, functionCall.name);
    }
  };

  // Handle request return
  const requestReturn = async (
    variables: AdminPostOrdersOrderReturnsReq,
    messageId: string
  ) => {
    return await requestReturnMutate(variables)
      .then(({ order }) => {
        notify.success("Success", `Return for ${order.id} created`);
        setReturnId(order.returns.at(-1).id);
        setReturnsCreated([...returnsCreated, messageId]);
        return { succes: "Return created successfully" };
      })
      .catch((e) => {
        notify.error("Error", JSON.stringify(e.message));
        return { error: e.message };
      });
  };

  // Handle cancel return
  const cancelReturn = async () => {
    return await cancelReturnMutate()
      .then(({ order }) => {
        notify.success("Success", `Return ${returnId} cancelled`);
        return { succes: "Return cancelled successfully" };
      })
      .catch((e) => {
        notify.error("Error", JSON.stringify(e.message));
        return { error: e.message };
      });
  };

  // Hook to get completion from AI
  const { isLoading, messages, input, handleInputChange, handleSubmit } =
    useChat({
      api: `${backendUrl}/admin/completion/order-returns`,
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      initialMessages: [
        {
          id: nanoid(),
          role: "assistant",
          content: "Hello, how can I help you?",
        },
      ],
      body: {
        items: cleanItems,
        customer: order.customer,
        return_reasons,
        shipping_options,
        currency_code: order.currency_code,
      },
      experimental_onFunctionCall: functionCallHandler,
      onFinish: (message) => {
        if (message.role === "function") return;
        if (message.function_call) return;

        setTimeout(() => {
          inputRef.current.focus();
        }, 10);
      },
    });

  // Input ref to refocus on submit
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom on new message
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [messages]);

  // framer-motion didn't do what I wanted, so I hacked together these animations
  const timer = (ms: number) => new Promise((res) => setTimeout(res, ms));

  const handleOnFocus = async () => {
    let height = containerRef.current.clientHeight;

    const grow = () => {
      if (height < 500) {
        height += 40;
        containerRef.current.setAttribute("style", `height: ${height}px`);
        requestAnimationFrame(grow);
      }
    };

    requestAnimationFrame(grow);
  };

  const handleOnBlur = async () => {
    let height = containerRef.current.clientHeight;

    const shrink = () => {
      if (height > 80 && messages.length === 1) {
        height -= height === 100 ? 20 : 40;
        containerRef.current.setAttribute("style", `height: ${height}px`);
        requestAnimationFrame(shrink);
      }
    };

    requestAnimationFrame(shrink);
  };

  // Handle form submit
  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleSubmit(e);
  };

  return (
    <Container className="p-8 flex flex-col gap-y-4">
      <h1 className="text-grey-90 inter-xlarge-semibold">Return Assistant</h1>
      <Text className="text-grey-50 flex flex-row gap-2">
        The Return Assistant will help you create a return for this order.
      </Text>
      <Container
        className="flex flex-col gap-2 bg-gray-50 p-4 whitespace-pre-wrap h-full overflow-y-auto scroll-smooth max-h-[500px]"
        ref={containerRef}
      >
        {messages
          .filter((m) => m.role !== "function")
          .map((m) => {
            if (m.function_call) {
              const function_call = m.function_call as FunctionCall;
              if (!function_call.hasOwnProperty("name")) return;
              if (function_call.name !== "propose_return") return;

              const args = JSON.parse(function_call.arguments);
              const returnCardData = handleReturnCard(args);
              if (!returnCardData || !returnApiObject) return;

              const { items, shipping, refund } = returnCardData;
              const returnCreated = returnsCreated.includes(m.id);

              return (
                <ReturnCard
                  key={m.id}
                  items={items}
                  shipping={shipping}
                  order={order}
                  handleReturnConfirmation={() =>
                    requestReturn(returnApiObject, m.id)
                  }
                  id={m.id}
                  refund={refund}
                  createReturnLoading={createReturnLoading}
                  returnCreated={returnCreated}
                  containerRef={containerRef}
                />
              );
            }
            if (m.content.length === 0) return;
            return (
              <Container
                key={m.id}
                className={`flex flex-row gap-2 bg-white p-3 w-fit max-w-[90%] ${
                  m.role === "assistant" ? "self-start" : "self-end"
                }`}
              >
                <Text className="font-semibold">
                  {m.role === "assistant" ? "🤖" : "🧑"}
                </Text>
                <Text className="whitespace-pre-wrap">{m.content}</Text>
              </Container>
            );
          })}
      </Container>
      <form onSubmit={handleFormSubmit} className="w-full">
        <div className="flex items-stretch gap-4 w-full">
          <div className="flex-1">
            <Input
              onFocus={handleOnFocus}
              onBlur={handleOnBlur}
              className="bg-gray-50 whitespace-pre-wrap h-auto"
              onChange={handleInputChange}
              value={input}
              ref={inputRef}
              disabled={isLoading}
            />
          </div>
          <Button isLoading={isLoading} type="submit">
            <ArrowDownLeftMini />
          </Button>
        </div>
      </form>
    </Container>
  );
};

// Return card component
const ReturnCard = ({
  items,
  shipping,
  refund,
  order,
  handleReturnConfirmation,
  createReturnLoading,
  returnCreated,
  containerRef,
}: ReturnCardProps) => (
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

// Set the widget injection zone
export const config: WidgetConfig = {
  zone: "order.details.after",
};

export default OrderAssistantWidget;
