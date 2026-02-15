
import React, { useState } from 'react';

interface OnboardingProps {
  onComplete: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "ESCANEA (3s)",
      desc: "Apunta a las etiquetas. La IA lee todo sola.",
      icon: "📸",
      color: "bg-blue-600"
    },
    {
      title: "REORGANIZA (4s)",
      desc: "Toca el botón para unir paquetes repetidos y elegir tu mapa.",
      icon: "🔄",
      color: "bg-indigo-600"
    },
    {
      title: "ENTREGA (3s)",
      desc: "Toca 'ENTREGADO'. Borro la basura técnica y vamos al siguiente.",
      icon: "✅",
      color: "bg-green-600"
    }
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-8 text-center">
      <div className={`w-24 h-24 ${steps[step].color} rounded-full flex items-center justify-center text-5xl mb-8 shadow-2xl animate-bounce`}>
        {steps[step].icon}
      </div>
      <h1 className="text-4xl font-extrabold mb-4 text-white tracking-tighter italic">
        {steps[step].title}
      </h1>
      <p className="text-xl text-gray-300 max-w-xs leading-relaxed">
        {steps[step].desc}
      </p>
      
      <div className="flex gap-2 mt-12 mb-12">
        {steps.map((_, i) => (
          <div key={i} className={`h-2 w-8 rounded-full transition-all duration-300 ${i === step ? 'bg-white w-12' : 'bg-gray-800'}`} />
        ))}
      </div>

      <button
        onClick={handleNext}
        className="w-full max-w-xs py-5 bg-white text-black font-black text-xl rounded-2xl active:scale-95 transition-transform"
      >
        {step === steps.length - 1 ? "¡VAMOS!" : "CONTINUAR"}
      </button>
    </div>
  );
};

export default Onboarding;
