const stringType = {
  type: "string",
};

const objectType = {
  type: "object",
};

const numberType = {
  type: "number",
};

const booleanType = {
  type: "boolean",
};

const arrayType = {
  type: "array",
};

const returnHooks = [
  {
    name: "propose_return",
    description:
      "Propose a return for the order. Note that prices are in cents. Divide them by 1000 when communication pricing information. Don't mention the value in cents. If no items, return shipping option, or return reason is specified, ask the user to specify them. If the user does not specify a return reason or a shipping option, ALWAYS ask them to pick one of the available options. You can't hallucinate or make up items, ids, reasons or shipping methods.",
    parameters: {
      ...objectType,
      properties: {
        items: {
          ...arrayType,
          items: {
            ...objectType,
            properties: {
              item_id: {
                ...stringType,
                description: "Returned item ID.",
              },
              quantity: {
                ...numberType,
                description: "Returned item quantity.",
              },
              note: {
                ...stringType,
                description: "Additional note for returned item.",
              },
              reason_id: {
                ...stringType,
                description:
                  "Return reason ID. Starts with `rr_`, NOT `reason_`. Must be one of the IDs retrieved by get_return_reasons. Never make up any ID yourself.",
              },
            },
            required: ["item_id", "quantity"],
          },
        },
        return_shipping: {
          ...objectType,
          properties: {
            option_id: {
              ...stringType,
              description:
                "ID of one of the shipping options returned by get_shipping_options.",
            },
            price: {
              ...numberType,
              description: "Return shipping option price.",
            },
          },
          required: ["option_id", "price"],
        },
        note: {
          ...stringType,
          description: "Additional note for return order.",
        },
        receive_now: {
          ...booleanType,
          description: "Flag to indicate immediate return receipt.",
        },
        no_notification: {
          ...booleanType,
          description: "Flag to indicate notifications.",
        },
        refund: {
          ...numberType,
          description:
            "Refund amount for return order. Calculate this by adding up the prices of the items being returned, and subtracting return_shipping.price. If the user does not specify a refund amount, calculate it yourself. If the user specifies a refund amount, use that. If the user specifies a refund amount that is too high, ask them to specify a lower amount.",
        },
        location_id: {
          ...stringType,
          description: "Location ID associated with return order.",
        },
      },
      required: ["items", "refund"],
    },
  },
  {
    name: "cancel_return",
    description: "Cancels the return with the given ID.",
    parameters: {
      ...objectType,
      properties: {
        return_id: {
          ...stringType,
          description: "ID of the return to be cancelled.",
        },
      },
      required: ["return_id"],
    },
  },
];

export default returnHooks;
