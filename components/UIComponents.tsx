import React from 'react';

export const Button = ({ onClick, children, className = '', disabled = false, variant = 'primary' }: any) => {
  const baseStyle = "px-4 py-2 rounded font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-neutral-100 text-neutral-900 hover:bg-white hover:scale-[1.02] shadow-lg shadow-black/20",
    secondary: "bg-neutral-800 text-neutral-100 hover:bg-neutral-700",
    accent: "bg-blue-600 text-white hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-900/20"
  };
  
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${variants[variant as keyof typeof variants]} ${className}`}
    >
      {children}
    </button>
  );
};

export const Input = ({ value, onChange, placeholder, className = '', type = 'text' }: any) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    className={`bg-neutral-900 text-neutral-100 px-4 py-3 rounded focus:outline-none focus:bg-neutral-800 focus:ring-1 focus:ring-neutral-700 w-full transition-colors ${className}`}
  />
);

export const TextArea = ({ value, onChange, placeholder, className = '', rows = 3 }: any) => (
  <textarea
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    rows={rows}
    className={`bg-neutral-900 text-neutral-100 px-4 py-3 rounded focus:outline-none focus:bg-neutral-800 focus:ring-1 focus:ring-neutral-700 w-full resize-none transition-colors ${className}`}
  />
);

export const Select = ({ value, onChange, options, className = '' }: any) => (
  <select
    value={value}
    onChange={onChange}
    className={`bg-neutral-900 text-neutral-100 px-4 py-2 rounded focus:outline-none focus:bg-neutral-800 w-full appearance-none cursor-pointer ${className}`}
  >
    {options.map((opt: any) => (
      <option key={opt.value} value={opt.value}>{opt.label}</option>
    ))}
  </select>
);

export const Card = ({ children, className = '', onClick, active = false }: any) => (
  <div 
    onClick={onClick}
    className={`bg-neutral-900 rounded-lg p-4 transition-all ${onClick ? 'cursor-pointer hover:bg-neutral-800' : ''} ${active ? 'bg-neutral-800 ring-1 ring-neutral-700' : ''} ${className}`}
  >
    {children}
  </div>
);

export const Spinner = () => (
  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
);

export const ImageUpload = ({ onImageSelected, currentImage, label = "Reference Image" }: { onImageSelected: (base64: string) => void, currentImage?: string, label?: string }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onImageSelected(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="mt-2">
      <label className="block text-xs text-neutral-500 mb-2 font-medium uppercase tracking-wider">{label}</label>
      <div className="flex items-center gap-3">
        <label className="cursor-pointer bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs px-3 py-2 rounded transition-colors">
            Choose File
            <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
            />
        </label>
        {currentImage && (
          <img src={currentImage} alt="Reference" className="w-10 h-10 object-cover rounded shadow-sm" />
        )}
      </div>
    </div>
  );
};

export const PromptModal = ({ isOpen, prompt, onChange, onConfirm, onCancel }: { isOpen: boolean, prompt: string, onChange?: (val: string) => void, onConfirm: () => void, onCancel: () => void, isGenerating: boolean }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
      <div className="bg-neutral-950 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col h-[80vh] overflow-hidden border border-neutral-800">
        <div className="p-6 flex justify-between items-center bg-neutral-900/50 shrink-0">
           <div>
               <h3 className="font-bold text-xl text-white">Review AI Prompt</h3>
               <p className="text-sm text-neutral-500">Make final adjustments before generation.</p>
           </div>
           <div className="text-[10px] bg-neutral-800 text-neutral-400 px-2 py-1 rounded font-bold uppercase tracking-wider">Editable</div>
        </div>
        <div className="flex-1 overflow-hidden flex flex-col p-6">
           {onChange ? (
             <TextArea 
                value={prompt} 
                onChange={(e: any) => onChange(e.target.value)} 
                className="flex-1 font-mono text-sm leading-relaxed p-6 bg-neutral-900/50 text-neutral-300 focus:bg-neutral-900 focus:text-white transition-colors rounded-xl resize-none"
             />
           ) : (
             <div className="bg-neutral-900/50 p-6 rounded-xl font-mono text-sm text-neutral-300 whitespace-pre-wrap leading-relaxed overflow-y-auto flex-1">
                {prompt}
             </div>
           )}
        </div>
        <div className="p-6 flex justify-end gap-4 bg-neutral-900/50 shrink-0">
           <Button variant="secondary" onClick={onCancel}>Cancel</Button>
           <Button variant="primary" onClick={onConfirm} className="px-8">
             Confirm & Generate (Background)
           </Button>
        </div>
      </div>
    </div>
  )
};