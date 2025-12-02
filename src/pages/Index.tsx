import { ChangelogSection } from "@/components/ChangelogSection";
import { changelogData } from "@/data/changelog";
import { Separator } from "@/components/ui/separator";
import evenLogo from "@/assets/even-logo.png";
import evenIcon from "@/assets/even-icon.png";
import rowPattern from "@/assets/row-pattern.png";
const Index = () => {
  return <div className="min-h-screen relative overflow-hidden" style={{
    backgroundColor: '#00313C'
  }}>
      {/* Row pattern background */}
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{
      backgroundImage: `url(${rowPattern})`,
      backgroundRepeat: 'repeat',
      backgroundSize: 'auto'
    }} />

      <div className="container max-w-5xl mx-auto px-4 py-12 relative">
        {/* Header */}
        <header className="mb-12 text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 -mx-4 px-4 py-8 rounded-2xl" style={{
        backgroundColor: '#FFB81C'
      }}>
          <div className="flex flex-col items-center justify-center gap-6 mb-4">
            <div className="flex items-center gap-4">
              
              <img src={evenLogo} alt="Even Tecnologia" className="h-12 w-auto object-contain animate-in fade-in slide-in-from-left duration-1000 delay-300" />
            </div>
            <p className="text-xl font-mono font-semibold" style={{
            color: '#00313C'
          }}>
              {changelogData.titulo}
            </p>
          </div>
          
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 border-2" style={{
          borderColor: '#00313C'
        }}>
            <span className="text-sm font-medium" style={{
            color: '#00313C'
          }}>Atualização:</span>
            <span className="text-sm font-semibold" style={{
            color: '#00313C'
          }}>
              {changelogData.data_atualizacao}
            </span>
          </div>

          <Separator className="w-32 mx-auto" style={{
          backgroundColor: '#00313C',
          opacity: 0.3
        }} />

          <p className="leading-relaxed max-w-4xl mx-auto text-left px-6 py-6 rounded-lg border-2" style={{
          color: '#00313C',
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          borderColor: '#00313C'
        }}>
            {changelogData.introducao}
          </p>
        </header>

        {/* Changelog Sections */}
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 text-primary-foreground bg-transparent">
          <ChangelogSection title="Novas Funcionalidades" icon="sparkles" items={changelogData.novas_funcionalidades} variant="default" />

          <ChangelogSection title="Melhorias Técnicas e Operacionais" icon="settings" items={changelogData.melhorias_tecnicas_operacionais} variant="secondary" />

          <ChangelogSection title="Performance e Infraestrutura" icon="zap" items={changelogData.performance_infraestrutura} variant="success" />
        </div>

        {/* Footer */}
        <footer className="mt-16 text-center space-y-4 animate-in fade-in duration-1000 delay-300 -mx-4 px-4 py-6 rounded-2xl" style={{
        backgroundColor: '#FFB81C'
      }}>
          <Separator className="w-32 mx-auto" style={{
          backgroundColor: '#00313C',
          opacity: 0.3
        }} />
          <div className="flex flex-col items-center gap-3">
            <img src={evenIcon} alt="Even Icon" className="w-12 h-12 object-contain animate-in zoom-in duration-700 delay-500" style={{
            animation: 'spin 8s linear infinite'
          }} />
            <p className="text-sm" style={{
            color: '#00313C'
          }}>
              Construído com excelência pela{" "}
              <span className="font-bold">{changelogData.empresa}</span>
            </p>
          </div>
          <p className="text-xs" style={{
          color: '#00313C',
          opacity: 0.8
        }}>
            Está faltando algo? Entre em contato conosco!
          </p>
        </footer>
      </div>
    </div>;
};
export default Index;