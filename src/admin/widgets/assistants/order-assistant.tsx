import type { WidgetConfig, OrderDetailsWidgetProps } from "@medusajs/admin";
import {
  useAdminCancelReturn,
  useAdminRequestReturn,
  useAdminReturnReasons,
  useAdminShippingOptions,
} from "medusa-react";
import { Button, Container, Input, Text } from "@medusajs/ui";
import { useChat } from "ai/react";
import { ArrowDownLeftMini } from "@medusajs/icons";
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
  Return,
  ReturnItem,
} from "@medusajs/medusa";
import { useEffect, useRef, useState } from "react";
import ReturnCard from "./return-card";

const backendUrl =
  process.env.MEDUSA_BACKEND_URL === "/"
    ? location.origin
    : process.env.MEDUSA_BACKEND_URL || "http://localhost:9000";

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
              if (!returnApiObject) return;

              const returnCreated = returnsCreated.includes(m.id);

              return (
                <ReturnCard
                  key={m.id}
                  args={args}
                  order={order}
                  shipping_options={shipping_options}
                  return_reasons={return_reasons}
                  handleReturnConfirmation={() =>
                    requestReturn(returnApiObject, m.id)
                  }
                  id={m.id}
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

// Set the widget injection zone
export const config: WidgetConfig = {
  zone: "order.details.after",
};

export default OrderAssistantWidget;
