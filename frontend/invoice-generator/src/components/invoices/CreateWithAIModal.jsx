import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import Button from '../ui/Button';
import TextareaField from '../ui/TextareaField';
import axiosInstance from '../../utils/axiosInstance';
import { API_PATHS } from '../../utils/apiPaths';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const CreateWithAIModal = ({isOpen, onClose}) => {

  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleGenerate = async () => {
    if (!text.trim()) {
      toast.error('Please paste some text to generate an invoice.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axiosInstance.post(API_PATHS.AI.PARSE_INVOICE_TEXT, { text });
      const invoiceData = response.data;
      
      toast.success('Invoice data extracted successfully!');
      onClose();
      
      // Navigate to create invoice page with the parsed data
      navigate('/invoices/new', { state: { aiData: invoiceData } });

    } catch (error) {
      toast.error('Failed to generate invoice from text.');
      console.error('AI parsing error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if(!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 text-center">
        <div className="fixed inset-0 bg-black/10 bg-opacity-50 transition-opacity" onClick={onClose}></div>
        
        <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 relative text-left transform transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-blue-600" />
              Create Invoice with AI
            </h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">&times;</button>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Paste any text that contains invoice details (like client name, items, quantities, and prices) and the AI will attempt to create an invoice from it.
            </p>
            <TextareaField 
              name="invoiceText"
              label="Paste Invoice Text Here"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g., 'Invoice for ClientCorp: 2 hours of design work at $150/hr and 1 logo for $800'"
              rows={8}
            />
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={handleGenerate} isLoading={isLoading}>
              {isLoading ? 'Generating...' : 'Generate Invoice'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreateWithAIModal