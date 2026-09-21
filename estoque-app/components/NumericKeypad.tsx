// Teclado numérico em tela — leitores de código de barras Bluetooth se anunciam
// para o Android/iOS como teclado físico conectado, e o SO então suprime o
// teclado virtual mesmo em campos de texto focados. Este componente evita
// depender do teclado virtual: os campos de quantidade ficam somente-leitura e
// todo input passa por aqui.
interface NumericKeypadProps {
  value: string;
  onChange: (value: string) => void;
  min?: number;
}

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export function NumericKeypad({ value, onChange, min = 0 }: NumericKeypadProps) {
  function step(delta: number) {
    const atual = parseFloat(value.replace(',', '.')) || 0;
    const novo = Math.max(min, Math.round((atual + delta) * 1000) / 1000);
    onChange(String(novo).replace('.', ','));
  }

  function digitar(d: string) {
    onChange(value + d);
  }

  function virgula() {
    if (!value.includes(',')) onChange(value === '' ? '0,' : value + ',');
  }

  function apagar() {
    onChange(value.slice(0, -1));
  }

  return (
    <div className="keypad">
      <div className="steppers">
        <button type="button" onClick={() => step(-10)}>
          −10
        </button>
        <button type="button" onClick={() => step(-1)}>
          −1
        </button>
        <button type="button" onClick={() => step(1)}>
          +1
        </button>
        <button type="button" onClick={() => step(10)}>
          +10
        </button>
      </div>
      <div className="grid">
        {DIGITS.map((d) => (
          <button key={d} type="button" onClick={() => digitar(d)}>
            {d}
          </button>
        ))}
        <button type="button" onClick={virgula}>
          ,
        </button>
        <button type="button" onClick={() => digitar('0')}>
          0
        </button>
        <button type="button" className="backspace" onClick={apagar} aria-label="Apagar">
          ⌫
        </button>
      </div>
      <style jsx>{`
        .keypad {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .steppers {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }
        .steppers button {
          appearance: none;
          border: 1.5px solid var(--color-border);
          background: var(--color-surface);
          color: var(--color-navy);
          min-height: 44px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
        }
        .steppers button:active {
          background: var(--color-bg);
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        .grid button {
          appearance: none;
          border: none;
          background: var(--color-bg);
          color: var(--color-navy);
          min-height: var(--tap-min);
          border-radius: 14px;
          font-size: 20px;
          font-weight: 700;
          cursor: pointer;
        }
        .grid button:active {
          background: var(--color-border);
        }
        .backspace {
          color: var(--color-red);
        }
      `}</style>
    </div>
  );
}
