export type StringToNumber<S extends string | number, AlternativeBase = never, Alternative extends AlternativeBase = never> = S extends number
  ? S
  : S extends '0'
    ? 0
    : S extends '1'
      ? 1
      : S extends '2'
        ? 2
        : S extends '3'
          ? 3
          : S extends '4'
            ? 4
            : S extends '5'
              ? 5
              : S extends '6'
                ? 6
                : S extends '7'
                  ? 7
                  : S extends '8'
                    ? 8
                    : S extends '9'
                      ? 9
                      : Alternative;
