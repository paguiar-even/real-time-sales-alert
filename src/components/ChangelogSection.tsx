import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Sparkles, Settings, Zap } from "lucide-react";
import { ChangelogItem } from "@/data/changelog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface ChangelogSectionProps {
  title: string;
  icon: "sparkles" | "settings" | "zap";
  items: ChangelogItem[];
  variant: "default" | "secondary" | "success";
}

const iconMap = {
  sparkles: Sparkles,
  settings: Settings,
  zap: Zap,
};

export const ChangelogSection = ({ title, icon, items, variant }: ChangelogSectionProps) => {
  const Icon = iconMap[icon];

  return (
    <Card className="overflow-hidden transition-all duration-500 border-2 hover:scale-[1.02] hover:shadow-2xl group" style={{
      backgroundColor: 'rgba(255, 184, 28, 0.1)',
      borderColor: '#FFB81C',
      backdropFilter: 'blur(10px)'
    }}>
      <Accordion type="single" collapsible defaultValue="item-1">
        <AccordionItem value="item-1" className="border-none">
          <AccordionTrigger className="px-6 py-6 hover:no-underline">
            <div className="flex items-center gap-3 w-full">
              <div className="p-2.5 rounded-lg group-hover:bg-primary/30 transition-all duration-300 group-hover:scale-110" style={{
                backgroundColor: '#FFB81C',
                color: '#00313C'
              }}>
                <Icon className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold text-left" style={{ color: '#FFB81C' }}>{title}</h2>
              <Badge variant={variant} className="ml-auto mr-2">
                {items.length} {items.length === 1 ? "item" : "itens"}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <ul className="space-y-6 pt-2">
              {items.map((item) => (
                <li key={item.number} className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="font-bold text-lg mt-0.5 min-w-[2rem]" style={{ color: '#FFB81C' }}>
                      {item.number}.
                    </span>
                    <div className="flex-1 space-y-2">
                      <h3 className="text-lg font-semibold leading-tight" style={{ color: '#FFFFFF' }}>
                        {item.title}
                      </h3>
                      {item.description && (
                        <p className="leading-relaxed" style={{ color: '#FFFFFF', opacity: 0.85 }}>{item.description}</p>
                      )}
                      {item.subitems && item.subitems.length > 0 && (
                        <ul className="space-y-2 ml-2 mt-3">
                          {item.subitems.map((subitem, idx) => (
                            <li key={idx} className="flex items-start gap-2 group/item">
                              <span className="mt-1 group-hover/item:scale-125 transition-transform" style={{ color: '#FFB81C' }}>
                                •
                              </span>
                              <div className="flex-1">
                                <span className="font-medium" style={{ color: '#FFFFFF' }}>{subitem.title}</span>
                                {subitem.description && (
                                  <span style={{ color: '#FFFFFF', opacity: 0.85 }}>: {subitem.description}</span>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
};
