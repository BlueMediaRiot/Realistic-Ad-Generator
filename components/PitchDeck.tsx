import React from 'react';
import { ProjectState } from '../types';
import { X, Printer, Video, Film, MapPin, Users } from 'lucide-react';

interface Props {
  data: ProjectState;
  onClose: () => void;
}

export const PitchDeck: React.FC<Props> = ({ data, onClose }) => {
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black overflow-y-auto">
            <div className="min-h-screen bg-black text-white p-8 max-w-[210mm] mx-auto relative print:p-0 print:max-w-none print:bg-white print:text-black">
                
                {/* Close/Print Controls (Hidden in Print) */}
                <div className="fixed top-4 right-4 flex gap-2 print:hidden z-50">
                    <button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded flex items-center gap-2">
                        <Printer size={16} /> Print / Save PDF
                    </button>
                    <button onClick={onClose} className="bg-neutral-800 hover:bg-neutral-700 text-white p-2 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                {/* SLIDE 1: Title Page */}
                <div className="min-h-[297mm] flex flex-col justify-center items-center text-center border-b border-neutral-800 mb-16 break-after-page">
                    <div className="mb-8">
                        <Video size={64} className="mx-auto mb-4 text-blue-500 print:text-black" />
                        <h1 className="text-6xl font-bold uppercase tracking-tight mb-4">{data.productName}</h1>
                        <p className="text-2xl text-neutral-400 print:text-neutral-600 font-light">{data.ideas.find(i => i.id === data.selectedIdeaId)?.title}</p>
                    </div>
                    <div className="max-w-2xl mx-auto">
                        <p className="text-lg italic font-serif leading-relaxed opacity-80 mb-8">"{data.ideas.find(i => i.id === data.selectedIdeaId)?.synopsis}"</p>
                        <div className="grid grid-cols-2 gap-8 text-sm uppercase tracking-widest text-neutral-500 print:text-neutral-700">
                            <div>
                                <span className="block font-bold mb-1">Duration</span>
                                {data.duration} Seconds
                            </div>
                            <div>
                                <span className="block font-bold mb-1">Tone</span>
                                {data.tags.slice(0, 3).join(' • ')}
                            </div>
                        </div>
                    </div>
                </div>

                {/* SLIDE 2: Director's Vision */}
                <div className="min-h-[297mm] mb-16 break-after-page">
                    <h2 className="text-4xl font-bold mb-8 border-b border-neutral-800 pb-4">Director's Vision</h2>
                    
                    <div className="grid grid-cols-2 gap-12">
                        <div>
                            <h3 className="text-xl font-bold mb-4 text-blue-400 print:text-black uppercase tracking-wider">Visual Language</h3>
                            <div className="bg-neutral-900 print:bg-neutral-100 p-6 rounded-lg mb-8">
                                <p className="font-mono text-sm leading-relaxed">{data.globalPrompt}</p>
                            </div>

                            <h3 className="text-xl font-bold mb-4 text-purple-400 print:text-black uppercase tracking-wider">Technical Specs</h3>
                            <ul className="space-y-4 text-sm">
                                <li className="flex justify-between border-b border-neutral-800 pb-2">
                                    <span className="text-neutral-500">Camera</span>
                                    <span className="font-bold">{data.lookSettings.camera}</span>
                                </li>
                                <li className="flex justify-between border-b border-neutral-800 pb-2">
                                    <span className="text-neutral-500">Lenses</span>
                                    <span className="font-bold">{data.lookSettings.lens}</span>
                                </li>
                                <li className="flex justify-between border-b border-neutral-800 pb-2">
                                    <span className="text-neutral-500">Film Stock</span>
                                    <span className="font-bold">{data.lookSettings.film}</span>
                                </li>
                            </ul>
                        </div>
                        
                        <div>
                             <h3 className="text-xl font-bold mb-4 text-yellow-400 print:text-black uppercase tracking-wider">Lighting & Mood</h3>
                             <div className="mb-6">
                                 <p className="text-sm opacity-80">{data.lookSettings.lighting}</p>
                             </div>
                             
                             {data.lookSettings.styleReferences.length > 0 && (
                                 <div className="grid grid-cols-2 gap-2">
                                     {data.lookSettings.styleReferences.slice(0, 4).map((ref, i) => (
                                         <div key={i} className="aspect-video bg-neutral-800 overflow-hidden rounded">
                                             <img src={ref.url} className="w-full h-full object-cover" alt="Mood Ref" />
                                         </div>
                                     ))}
                                 </div>
                             )}
                        </div>
                    </div>
                </div>

                {/* SLIDE 3: Cast & Locations */}
                <div className="min-h-[297mm] mb-16 break-after-page">
                    <h2 className="text-4xl font-bold mb-8 border-b border-neutral-800 pb-4">Cast & Locations</h2>
                    
                    <div className="mb-12">
                        <div className="flex items-center gap-2 mb-4 text-blue-400 print:text-black">
                            <Users size={24} />
                            <h3 className="text-2xl font-bold uppercase">Cast</h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                            {data.subjects.filter(s => s.image).map(s => (
                                <div key={s.id} className="space-y-2">
                                    <div className="aspect-[3/4] bg-neutral-900 rounded-lg overflow-hidden">
                                        <img src={s.image!.url} className="w-full h-full object-cover" alt={s.name} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold">{s.name}</h4>
                                        <p className="text-xs text-neutral-500 line-clamp-3">{s.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center gap-2 mb-4 text-green-400 print:text-black">
                            <MapPin size={24} />
                            <h3 className="text-2xl font-bold uppercase">Locations</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            {data.locations.filter(l => l.image).map(l => (
                                <div key={l.id} className="space-y-2">
                                    <div className="aspect-video bg-neutral-900 rounded-lg overflow-hidden">
                                        <img src={l.image!.url} className="w-full h-full object-cover" alt={l.name} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold">{l.name}</h4>
                                        <p className="text-xs text-neutral-500 line-clamp-2">{l.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* SLIDE 4+: Storyboard */}
                <div className="min-h-[297mm]">
                    <h2 className="text-4xl font-bold mb-8 border-b border-neutral-800 pb-4">Storyboard</h2>
                    
                    <div className="space-y-12">
                        {data.shots.filter(s => s.image).map((shot, index) => {
                             // Group every 2 shots for better layout? Or just list them.
                             // Let's do a simple list for the pitch deck
                             return (
                                <div key={shot.id} className="flex gap-8 items-start break-inside-avoid">
                                    <div className="w-1/2">
                                        <div className="aspect-video bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800">
                                            <img src={shot.image!.url} className="w-full h-full object-cover" alt={`Shot ${shot.number}`} />
                                        </div>
                                    </div>
                                    <div className="w-1/2 py-2">
                                        <div className="flex items-baseline gap-4 mb-2">
                                            <span className="text-4xl font-bold text-neutral-700 print:text-neutral-300">#{shot.number}</span>
                                            <span className="text-xs font-bold uppercase tracking-wider bg-neutral-800 print:bg-neutral-200 px-2 py-1 rounded text-neutral-300 print:text-black">{shot.shotComposition}</span>
                                        </div>
                                        <p className="text-lg font-medium leading-relaxed mb-4">{shot.description}</p>
                                        <div className="grid grid-cols-2 gap-y-2 text-xs text-neutral-500">
                                            <div><span className="font-bold block text-neutral-400 print:text-black">Action</span> {shot.action}</div>
                                            <div><span className="font-bold block text-neutral-400 print:text-black">Movement</span> {shot.cameraMove}</div>
                                        </div>
                                    </div>
                                </div>
                             )
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};