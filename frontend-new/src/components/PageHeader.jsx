import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { ArrowLeft, Globe } from 'lucide-react';

const PageHeader = ({ title, onBack, rightContent, showLanguageToggle = true }) => {
    const { language, toggleLanguage, t } = useLanguage();

    return (
        <nav className="bg-white shadow-md fixed w-full z-50 top-0">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between h-auto md:h-20 items-center py-4 md:py-0 gap-4 md:gap-0">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        {onBack && (
                            <button onClick={onBack} className="text-[#800000] hover:text-[#600000] p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
                                <ArrowLeft size={24} />
                            </button>
                        )}
                        <h1 className="playfair text-xl md:text-2xl font-bold maroon-text truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                            {title}
                        </h1>
                    </div>

                    <div className="flex gap-4 items-center w-full md:w-auto justify-end">
                        {showLanguageToggle && (
                            <button
                                onClick={toggleLanguage}
                                className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full border-2 border-[#D4AF37] text-[#800000] hover:bg-[#D4AF37] hover:text-white transition-all text-sm md:text-base font-medium"
                            >
                                <Globe size={18} className="md:w-5 md:h-5" />
                                {language === 'en' ? 'मराठी' : 'English'}
                            </button>
                        )}
                        {rightContent}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default PageHeader;
