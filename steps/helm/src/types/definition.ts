export const definitions = {
    "$schema": "http://json-schema.org/draft-07/schema",
    "type": "object",
    "properties": {
      "$schema": {
        "type": "string"
      },
      "variable": {
        "type": "object",
        "patternProperties": {
          "^[a-z0-9-]*$": {
            "type": "object",
            "properties": {
              "type": {
                "type": "string",
                "enum": ["global", "scoped", "scoped-name"]
              },
              "case": {
                "type": "string",
                "enum": ["snake"]
              },
              "static": {
                "type": "boolean"
              },
              "secret": {
                "type": "boolean"
              },
              "default": {
                "type": "string"
              },
              "generated": {
                "type": "number"
              },
              "binding": {
                "type": "object",
                "patternProperties": {
                  ".*": {
                    "type": "string"
                  }
                },
                "additionalProperties": false
              }
            },
            "required": ["type"],
            "additionalProperties": false,
            "if": {
              "properties": {
                "type": {
                  "const": "scoped-name"
                }
              }
            },
            "then": {
              "not": {
                "required": ["static", "secret", "default", "case"]
              }
            }
          }
        },
        "additionalProperties": false
      },
      "service": {
        "type": "object",
        "patternProperties": {
          ".*": {
            "type": "object",
            "properties": {
              "type": {
                "type": "string",
                "enum": ["global", "scoped"]
              },
              "definition": {
                "type": "object",
                "properties": {
                  "origin": {
                    "type": "object",
                    "properties": {
                      "repository": {
                        "type": "string",
                        "pattern": "^(?:(?:https?):\\/)?(?:www\\.)?[^/\r\n]+(?:/[^\r\n]*)?$"
                      },
                      "version": {
                        "type": "string"
                      },
                      "name": {
                        "type": "string"
                      }
                    },
                    "required": ["repository", "version", "name"],
                    "additionalProperties": false
                  },
                  "from_reference": {
                    "type": "string"
                  },
                  "from_directory": {
                    "type": "object",
                    "properties": {
                      "version": {
                        "type": "string"
                      },
                      "path": {
                        "type": "string"
                      }
                    },
                    "required": ["version", "path"],
                    "additionalProperties": false
                  }
                },
                "required": ["origin"],
                "additionalProperties": false
              },
              "environment": {
                "type": "object",
                "patternProperties": {
                  ".*": {
                    "type": "object",
                    "properties": {
                      "default": {
                        "anyOf": [
                          {
                            "type": "boolean"
                          },
                          {
                            "type": "string"
                          },
                          {
                            "type": "number"
                          }
                        ]
                      },
                      "type": {
                        "type": "string",
                        "enum": ["global", "scoped", "scoped-name"]
                      },
                      "generated": {
                        "type": "number"
                      }
                    },
                    "additionalProperties": false
                  }
                },
                "additionalProperties": false
              },
              "origin_name_var": {
                "type": "string"
              }
            },
            "required": ["type", "definition", "origin_name_var"],
            "additionalProperties": false
          }
        },
        "additionalProperties": false
      },
      "job": {
        "type": "object",
        "patternProperties": {
          ".*": {
            "type": "object",
            "properties": {
              "type": {
                "type": "string",
                "enum": ["global", "scoped"]
              },
              "definition": {
                "type": "object",
                "properties": {
                  "on": {
                    "type": "string"
                  },
                  "image": {
                    "type": "string"
                  }
                },
                "additionalProperties": false
              },
              "binding": {
                "type": "object",
                "patternProperties": {
                  ".*": {
                    "type": "string"
                  }
                },
                "additionalProperties": false
              }
            },
            "required": ["type"],
            "additionalProperties": false
          }
        },
        "additionalProperties": false
      },
      "binding": {
        "type": "object",
        "patternProperties": {
          ".*": {
            "type": "string",
            "pattern": "^[a-z0-9-]*$"
          }
        },
        "additionalProperties": false
      },
      "expose": {
        "type": "object",
        "patternProperties": {
          ".*": {
            "type": "object",
            "properties": {
              "type": {
                "type": "string",
                "enum": ["internal", "load-balancer"]
              },
              "path": {
                "type": "string"
              },
              "domainPrefix": {
                "type": "string"
              }
            },
            "required": ["type"],
            "additionalProperties": false,
            "if": {
              "properties": {
                "type": {
                  "const": "load-balancer"
                }
              }
            },
            "then": {
              "required": ["path", "domainPrefix"]
            },
            "else": {
              "not": {
                "required": ["path", "domainPrefix"]
              }
            }
          }
        },
        "additionalProperties": false
      },
      "connection": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "target": {
              "type": "string"
            }
          },
          "required": ["target"],
          "additionalProperties": false
        }
      },
      "flag": {
        "type": "object",
        "properties": {
          "sticky-session": {
            "type": "boolean"
          }
        },
        "additionalProperties": false
      }
    },
    "additionalProperties": false
  } as const;
  