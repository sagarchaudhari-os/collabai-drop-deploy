import React from "react";
import { Input, List } from "antd";

const ChromaDBConfig = ({ formState, setFormState, isEditing }) => {
  const defaultValues = {
    chromaHost: "",
    chromaPort: 8000,
    chromaPassword: "",
  };

  // Mask password when not editing
  const renderMaskedPassword = () => {
    if (formState?.chromaPassword?.length > 3) {
      const firstTwo = formState?.chromaPassword?.slice(0, 2);
      const lastTwo = formState?.chromaPassword?.slice(-2);
      const middle = formState?.chromaPassword?.slice(2, -2).replace(/./g, "*");
      return firstTwo + middle + lastTwo;
    }
    return formState?.chromaPassword || "";
  };

  const data = [
    {
      title: "ChromaDB Host URL",
      description: formState?.chromaHost || defaultValues.chromaHost,
    },
    {
      title: "Port",
      description: formState?.chromaPort || defaultValues.chromaPort,
    },

    {
      title: "Password",
      description: formState?.chromaPassword || defaultValues.chromaPassword,
    },
  ];

  return (
    <div className="config-container">
      <List
        className="custom-list"
        size="small"
        bordered
        dataSource={data}
        renderItem={(item) => (
          <List.Item>
            <List.Item.Meta
              title={<span className="item-title">{item.title}</span>}
              description={
                item.title === "Password" ? (
                  isEditing ? (
                    <Input.Password
                      value={item.description}
                      placeholder="Enter ChromaDB password"
                      onChange={(e) =>
                        setFormState({
                          ...formState,
                          chromaPassword: e.target.value,
                        })
                      }
                      className="field-width"
                    />
                  ) : (
                    renderMaskedPassword()
                  )
                ) : item.title === "ChromaDB Host URL" ? (
                  <Input
                    disabled={!isEditing}
                    value={formState?.chromaHost || ""}
                    placeholder="https://your-chroma-server.com"
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        chromaHost: e.target.value,
                      })
                    }
                    className="field-width"
                  />
                ) : item.title === "Port" ? (
                  <Input
                    type="number"
                    disabled={!isEditing}
                    value={formState?.chromaPort || ""}
                    placeholder="8000"
                    onChange={(e) => {
                      const port = parseInt(e.target.value);
                        setFormState({
                          ...formState,
                          chromaPort: port,
                        });
                    }}
                    className="field-width"
                  />
                ) : (
                  item.description
                )
              }
            />
          </List.Item>
        )}
      />
    </div>
  );
};

export default ChromaDBConfig;