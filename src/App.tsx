import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Receipt, Pill, FileText, Plus, Trash2, Download, RotateCcw } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import { DoctorHeader } from './components/DoctorHeader';
import { PatientForm } from './components/PatientForm';
import { SignatureCanvas } from './components/SignatureCanvas';
import { DoctorInfo, PatientInfo, InvoiceItem, Medication } from './types';

const DEFAULT_DOCTOR: DoctorInfo = {
  name: 'Dr. ROKHAYA DIOP',
  specialty: 'Médecin généraliste',
  phone: '+221 774474590',
};

const INITIAL_PATIENT: PatientInfo = {
  name: '',
  age: '',
  date: new Date().toISOString().split('T')[0],
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'invoice' | 'prescription' | 'bulletin'>('invoice');
  const [patientInfo, setPatientInfo] = useState<PatientInfo>(INITIAL_PATIENT);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [bulletinItems, setBulletinItems] = useState<string[]>([]);
  const [diagnosis, setDiagnosis] = useState('');
  const [signature, setSignature] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const pdfContentRef = useRef<HTMLDivElement>(null);
  const doctorInfo = DEFAULT_DOCTOR;

  const sanitizeFileSegment = (value: string, fallback: string) => {
    const cleaned = value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, ' ')
      .trim()
      .replace(/\s+/g, '_');

    return cleaned || fallback;
  };

  const addInvoiceItem = () => {
    const newItem: InvoiceItem = {
      id: Math.random().toString(36).substr(2, 9),
      description: '',
      quantity: 1,
      price: 0,
    };
    setInvoiceItems([...invoiceItems, newItem]);
  };

  const updateInvoiceItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setInvoiceItems(items => items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeInvoiceItem = (id: string) => {
    setInvoiceItems(items => items.filter(item => item.id !== id));
  };

  const addMedication = () => {
    const newMed: Medication = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      dosage: '',
      duration: '',
      posology: { morning: false, noon: false, evening: false, night: false },
    };
    setMedications([...medications, newMed]);
  };

  const updateMedication = (id: string, field: string, value: any) => {
    setMedications(meds => meds.map(med => {
      if (med.id === id) {
        if (field.includes('.')) {
          const [parent, child] = field.split('.');
          return { ...med, [parent]: { ...(med as any)[parent], [child]: value } };
        }
        return { ...med, [field]: value };
      }
      return med;
    }));
  };

  const removeMedication = (id: string) => {
    setMedications(meds => meds.filter(med => med.id !== id));
  };

  const addBulletinItem = () => {
    setBulletinItems([...bulletinItems, '']);
  };

  const updateBulletinItem = (index: number, value: string) => {
    const newItems = [...bulletinItems];
    newItems[index] = value;
    setBulletinItems(newItems);
  };

  const removeBulletinItem = (index: number) => {
    setBulletinItems(bulletinItems.filter((_, i) => i !== index));
  };

  const resetAll = () => {
    setPatientInfo(INITIAL_PATIENT);
    setInvoiceItems([]);
    setMedications([]);
    setBulletinItems([]);
    setDiagnosis('');
    setSignature(null);
  };

  const calculateTotal = () => {
    return invoiceItems.reduce((acc, item) => acc + (item.quantity * item.price), 0);
  };

  const generatePDF = async () => {
    const element = pdfContentRef.current;
    if (!element || isGeneratingPdf) return;

    let captureRoot: HTMLDivElement | null = null;

    try {
      setIsGeneratingPdf(true);

      if ('fonts' in document) {
        await document.fonts.ready;
      }

      captureRoot = document.createElement('div');
      captureRoot.style.position = 'fixed';
      captureRoot.style.top = '0';
      captureRoot.style.left = '-10000px';
      captureRoot.style.pointerEvents = 'none';
      captureRoot.style.background = '#FFFFFF';
      captureRoot.style.zIndex = '-1';

      const clonedElement = element.cloneNode(true) as HTMLDivElement;
      captureRoot.appendChild(clonedElement);
      document.body.appendChild(captureRoot);

      const canvas = await html2canvas(clonedElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#FFFFFF',
        width: clonedElement.scrollWidth,
        height: clonedElement.scrollHeight,
        windowWidth: clonedElement.scrollWidth,
        windowHeight: clonedElement.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      let remainingHeight = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      remainingHeight -= pageHeight;

      while (remainingHeight > 0) {
        position = remainingHeight - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        remainingHeight -= pageHeight;
      }

      const fileName = [
        activeTab,
        sanitizeFileSegment(patientInfo.name, 'patient'),
        sanitizeFileSegment(patientInfo.date || INITIAL_PATIENT.date, 'date'),
      ].join('_');

      await pdf.save(`${fileName}.pdf`, { returnPromise: true });
    } catch (error) {
      console.error('PDF generation failed:', error);
      window.alert("Le telechargement du PDF a echoue. Reessayez apres avoir rempli le document.");
    } finally {
      captureRoot?.remove();
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="min-h-screen pb-24 max-w-md mx-auto relative overflow-x-hidden">
      {/* Hidden container for PDF generation */}
      <div className="absolute left-[-9999px] top-0">
        <div ref={pdfContentRef} id="pdf-content" className="w-[210mm] min-h-[297mm] p-12 bg-white font-sans text-medical-slate relative overflow-hidden">
          {/* Header */}
          <div className="flex justify-between items-start mb-12 relative">
            <div className="flex-1 border-r-2 border-medical-blue pr-8">
              <h1 className="text-3xl font-bold text-medical-blue uppercase tracking-tight mb-1">{doctorInfo.name}</h1>
              <p className="text-medical-green font-bold text-xl mb-4">{doctorInfo.specialty}</p>
              <p className="text-medical-blue font-bold text-2xl">{doctorInfo.phone}</p>
            </div>
            <div className="flex-1 pl-8 pt-2">
              <div className="flex items-center gap-4 mb-6">
                <span className="text-medical-blue font-bold text-xl uppercase whitespace-nowrap">DATE :</span>
                <span className="text-medical-slate font-hand text-3xl border-b-2 border-dotted border-medical-slate/40 flex-1 pb-1">
                  {new Date(patientInfo.date).toLocaleDateString('fr-FR')}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-medical-blue font-bold text-xl uppercase whitespace-nowrap">NOM :</span>
                <span className="text-medical-slate font-hand text-3xl border-b-2 border-dotted border-medical-slate/40 flex-1 pb-1">
                  {patientInfo.name}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-12">
            <span className="text-medical-blue font-bold text-xl uppercase whitespace-nowrap">PRENOM :</span>
            <span className="text-medical-slate font-hand text-3xl border-b-2 border-dotted border-medical-slate/40 flex-1 pb-1">
              {patientInfo.age}
            </span>
          </div>

          {/* Title */}
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-medical-green uppercase underline decoration-4 underline-offset-8 inline-block">
              {activeTab === 'invoice' ? 'Facture' : activeTab === 'prescription' ? 'Ordonnance' : 'Bulletin Médical'}
            </h2>
          </div>

          {/* Content */}
          <div className="flex-1 min-h-[150mm]">
            {activeTab === 'invoice' ? (
              <div className="bg-medical-cyan/30 rounded-3xl overflow-hidden border-2 border-medical-blue">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-medical-blue text-white">
                      <th className="p-6 text-xl font-bold border-r-2 border-white/20">Désignation</th>
                      <th className="p-6 text-xl font-bold text-center border-r-2 border-white/20">Qté</th>
                      <th className="p-6 text-xl font-bold text-center border-r-2 border-white/20">Prix</th>
                      <th className="p-6 text-xl font-bold text-right">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceItems.map((item, idx) => (
                      <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-medical-cyan/10'}>
                        <td className="p-6 text-2xl font-hand border-r-2 border-medical-blue/20">{item.description}</td>
                        <td className="p-6 text-2xl font-hand text-center border-r-2 border-medical-blue/20">{item.quantity}</td>
                        <td className="p-6 text-2xl font-hand text-center border-r-2 border-medical-blue/20">{item.price.toLocaleString()}</td>
                        <td className="p-6 text-2xl font-hand text-right font-bold">{(item.quantity * item.price).toLocaleString()}</td>
                      </tr>
                    ))}
                    {/* Fill empty rows */}
                    {Array.from({ length: Math.max(0, 6 - invoiceItems.length) }).map((_, i) => (
                      <tr key={i} className={(invoiceItems.length + i) % 2 === 0 ? 'bg-white' : 'bg-medical-cyan/10'}>
                        <td className="p-8 border-r-2 border-medical-blue/20"></td>
                        <td className="p-8 border-r-2 border-medical-blue/20"></td>
                        <td className="p-8 border-r-2 border-medical-blue/20"></td>
                        <td className="p-8"></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="p-6 bg-white border-t-2 border-medical-blue flex justify-end items-center gap-8">
                  <div className="bg-medical-blue text-white px-8 py-2 rounded-full text-2xl font-bold">Total</div>
                  <div className="text-3xl font-bold">{calculateTotal().toLocaleString()}fcfa</div>
                </div>
              </div>
            ) : activeTab === 'prescription' ? (
              <div className="space-y-12 text-center">
                {medications.map(med => (
                  <div key={med.id} className="space-y-2">
                    <div className="flex justify-center items-baseline gap-8">
                      <h4 className="text-4xl font-hand">{med.name} {med.dosage}</h4>
                      <span className="text-3xl font-hand">{med.duration}</span>
                    </div>
                    <div className="text-3xl font-hand opacity-80">
                      {Object.entries(med.posology)
                        .filter(([_, val]) => val)
                        .map(([key, _]) => key === 'morning' ? 'le matin' : key === 'noon' ? 'le midi' : key === 'evening' ? 'le soir' : 'la nuit')
                        .join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-8 text-center">
                {bulletinItems.map((item, idx) => (
                  <p key={idx} className="text-4xl font-hand">{item}</p>
                ))}
                {diagnosis && (
                  <div className="mt-16 pt-8 border-t-2 border-medical-blue/10">
                    <p className="text-3xl font-hand"><span className="font-bold font-sans text-2xl uppercase">Diagnostique:</span> {diagnosis}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-auto flex justify-between items-end">
            <div className="w-48 h-48 opacity-10">
              <svg viewBox="0 0 24 24" fill="currentColor" className="text-medical-green">
                <path d="M12,2L4.5,20.29L5.21,21L12,18L18.79,21L19.5,20.29L12,2Z" />
              </svg>
            </div>
            
            <div className="text-center space-y-8">
              <div className="border-4 border-medical-blue p-4 rounded-lg transform -rotate-2">
                <p className="text-xl font-bold text-medical-blue">{doctorInfo.name} MBODJI</p>
                <p className="text-lg font-bold text-medical-blue">Médecin Santé au Travail</p>
              </div>
              
              <div className="relative pt-12">
                <div className="w-64 border-t-4 border-medical-slate mx-auto"></div>
                <p className="text-2xl font-bold uppercase tracking-widest mt-2">SIGNATURE</p>
                {signature && <img src={signature} alt="Signature" className="absolute top-0 left-1/2 -translate-x-1/2 h-32 object-contain mix-blend-multiply" />}
              </div>
            </div>
          </div>

          {/* Logo Bottom */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
            <div className="w-24 h-24 bg-black rounded-full flex items-center justify-center">
              <div className="w-16 h-16 text-medical-green">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19,3H5C3.89,3 3,3.9 3,5V19C3,20.1 3.89,21 5,21H19C20.1,21 21,20.1 21,19V5C21,3.9 20.1,3 19,3M19,19H5V5H19V19M11,17H13V13H17V11H13V7H11V11H7V13H11V17Z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main UI */}
      <div className="p-4 pt-8">
        <DoctorHeader info={doctorInfo} />

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <PatientForm 
              info={patientInfo} 
              onChange={setPatientInfo} 
              showWeight={activeTab === 'prescription'} 
            />

            {activeTab === 'invoice' ? (
              <div className="space-y-4">
                <div className="bg-white rounded-xl shadow-sm border border-medical-blue/10 overflow-hidden">
                  <div className="p-3 bg-medical-blue text-white flex justify-between items-center">
                    <h3 className="text-xs uppercase tracking-widest font-bold">Facture</h3>
                    <button onClick={addInvoiceItem} className="flex items-center gap-1 text-[10px] font-bold uppercase bg-white/20 px-2 py-1 rounded">
                      <Plus size={14} /> Ajouter
                    </button>
                  </div>
                  <div className="divide-y divide-medical-blue/5">
                    {invoiceItems.map(item => (
                      <div key={item.id} className="p-3 space-y-2">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateInvoiceItem(item.id, 'description', e.target.value)}
                          placeholder="Désignation"
                          className="w-full text-sm font-hand text-lg outline-none bg-transparent border-b border-dotted border-medical-slate/20"
                        />
                        <div className="flex gap-3">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateInvoiceItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                            className="w-16 text-sm outline-none bg-transparent border-b border-dotted border-medical-slate/20"
                            placeholder="Qté"
                          />
                          <input
                            type="number"
                            value={item.price}
                            onChange={(e) => updateInvoiceItem(item.id, 'price', parseInt(e.target.value) || 0)}
                            className="flex-1 text-sm outline-none bg-transparent border-b border-dotted border-medical-slate/20"
                            placeholder="Prix"
                          />
                          <button onClick={() => removeInvoiceItem(item.id)} className="text-red-300"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 bg-medical-cyan/10 flex justify-between items-center">
                    <span className="text-xs uppercase font-bold text-medical-blue">Total</span>
                    <span className="text-lg font-bold text-medical-blue">{calculateTotal().toLocaleString()} FCFA</span>
                  </div>
                </div>
              </div>
            ) : activeTab === 'prescription' ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center px-2">
                  <h3 className="text-xs uppercase tracking-widest font-bold text-medical-blue">Ordonnance</h3>
                  <button onClick={addMedication} className="flex items-center gap-1 text-[10px] font-bold uppercase text-medical-green">
                    <Plus size={14} /> Ajouter
                  </button>
                </div>
                {medications.map(med => (
                  <div key={med.id} className="bg-white p-4 rounded-xl shadow-sm border border-medical-blue/10 space-y-3">
                    <div className="flex justify-between gap-2">
                      <input
                        type="text"
                        value={med.name}
                        onChange={(e) => updateMedication(med.id, 'name', e.target.value)}
                        placeholder="Médicament"
                        className="flex-1 font-hand text-lg outline-none border-b border-dotted border-medical-slate/20"
                      />
                      <button onClick={() => removeMedication(med.id)} className="text-red-300"><Trash2 size={16} /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={med.dosage}
                        onChange={(e) => updateMedication(med.id, 'dosage', e.target.value)}
                        placeholder="Dosage"
                        className="text-sm outline-none border-b border-dotted border-medical-slate/20"
                      />
                      <input
                        type="text"
                        value={med.duration}
                        onChange={(e) => updateMedication(med.id, 'duration', e.target.value)}
                        placeholder="Durée"
                        className="text-sm outline-none border-b border-dotted border-medical-slate/20"
                      />
                    </div>
                    <div className="flex gap-1 pt-1">
                      {Object.entries(med.posology).map(([key, val]) => (
                        <button
                          key={key}
                          onClick={() => updateMedication(med.id, `posology.${key}`, !val)}
                          className={`px-2 py-1 rounded text-[8px] font-bold uppercase transition-all ${
                            val ? 'bg-medical-green text-white' : 'bg-medical-slate/5 text-medical-slate/40'
                          }`}
                        >
                          {key === 'morning' ? 'Matin' : key === 'noon' ? 'Midi' : key === 'evening' ? 'Soir' : 'Nuit'}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center px-2">
                  <h3 className="text-xs uppercase tracking-widest font-bold text-medical-blue">Bulletin Médical</h3>
                  <button onClick={addBulletinItem} className="flex items-center gap-1 text-[10px] font-bold uppercase text-medical-green">
                    <Plus size={14} /> Ajouter Examen
                  </button>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-medical-blue/10 space-y-3">
                  {bulletinItems.map((item, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={item}
                        onChange={(e) => updateBulletinItem(idx, e.target.value)}
                        placeholder="Examen..."
                        className="flex-1 font-hand text-lg outline-none border-b border-dotted border-medical-slate/20"
                      />
                      <button onClick={() => removeBulletinItem(idx)} className="text-red-300"><Trash2 size={16} /></button>
                    </div>
                  ))}
                  <div className="pt-4">
                    <label className="text-[10px] uppercase font-bold text-medical-blue block mb-1">Diagnostique</label>
                    <textarea
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      className="w-full text-sm font-hand text-lg bg-medical-bg/50 rounded-lg p-2 outline-none focus:ring-1 focus:ring-medical-blue/20 min-h-[80px]"
                      placeholder="Visite médicale annuelle..."
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6">
              <SignatureCanvas onSave={setSignature} onClear={() => setSignature(null)} />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-6">
              <button
                type="button"
                onClick={generatePDF}
                disabled={isGeneratingPdf}
                className="flex items-center justify-center gap-2 bg-medical-blue text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-medical-blue/20 active:scale-95 transition-transform disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                <Download size={18} /> {isGeneratingPdf ? 'Generation...' : 'PDF'}
              </button>
              <button
                onClick={resetAll}
                className="flex items-center justify-center gap-2 bg-white text-medical-slate border border-medical-slate/10 py-3 rounded-xl font-bold text-sm active:scale-95 transition-transform"
              >
                <RotateCcw size={18} /> Reset
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-medical-blue/5 px-4 py-3 flex justify-around items-center z-50 shadow-lg">
        <button
          onClick={() => setActiveTab('invoice')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'invoice' ? 'text-medical-blue' : 'text-medical-slate/30'}`}
        >
          <Receipt size={20} />
          <span className="text-[9px] font-bold uppercase">Facture</span>
        </button>
        <button
          onClick={() => setActiveTab('prescription')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'prescription' ? 'text-medical-blue' : 'text-medical-slate/30'}`}
        >
          <Pill size={20} />
          <span className="text-[9px] font-bold uppercase">Ordonnance</span>
        </button>
        <button
          onClick={() => setActiveTab('bulletin')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'bulletin' ? 'text-medical-blue' : 'text-medical-slate/30'}`}
        >
          <FileText size={20} />
          <span className="text-[9px] font-bold uppercase">Bulletin</span>
        </button>
      </nav>
    </div>
  );
}
