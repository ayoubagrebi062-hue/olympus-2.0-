// Full component code here...
'use client';

import React, { useState, useRef, forwardRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { cn } from '../src/lib/utils';

interface Widget {
  id: string;
  type: 'stats' | 'chart' | 'list' | 'calendar';
  properties: Record<string, any>;
}

interface CustomizableWidgetsProps {
  initialWidgets: Widget[];
}

const CustomizableWidgets = forwardRef<HTMLDivElement, CustomizableWidgetsProps>(({ initialWidgets }, ref) => {
  const [widgets, setWidgets] = useState<Widget[]>(initialWidgets);
  const [, drop] = useDrop(() => ({
    accept: 'WIDGET',
    drop: (item: Widget, monitor) => {
      const delta = monitor.getDifferenceFromInitialOffset();
      if (delta) {
        // Logic for updating widget position based on delta
      }
    },
  }));

  const moveWidget = (dragIndex: number, hoverIndex: number) => {
    const updatedWidgets = [...widgets];
    const [removed] = updatedWidgets.splice(dragIndex, 1);
    updatedWidgets.splice(hoverIndex, 0, removed);
    setWidgets(updatedWidgets);
  };

  return (
    <div
      ref={ref}
      className="bg-[#0a0a0a] min-h-screen p-6"
      aria-label="Customizable Widgets"
    >
      <div className="grid gap-4">
        <h2 className="text-4xl font-bold text-white mb-4">Customize your dashboard with ease</h2>
        {widgets.map((widget, index) => (
          <WidgetItem
            key={widget.id}
            index={index}
            widget={widget}
            moveWidget={moveWidget}
          />
        ))}
      </div>
    </div>
  );
});

interface WidgetItemProps {
  widget: Widget;
  index: number;
  moveWidget: (dragIndex: number, hoverIndex: number) => void;
}

const WidgetItem: React.FC<WidgetItemProps> = ({ widget, index, moveWidget }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [, drag] = useDrag({
    type: 'WIDGET',
    item: { type: widget.type, id: widget.id, index },
  });
  const [, drop] = useDrop({
    accept: 'WIDGET',
    hover: (item: { index: number }) => {
      if (item.index !== index) {
        moveWidget(item.index, index);
        item.index = index;
      }
    },
  });

  drag(drop(ref));

  return (
    <div
      ref={ref}
      className={cn(
        'bg-white/[0.03] backdrop-blur-xl shadow-[0_0_50px_rgba(124,58,237,0.3)] p-4 rounded-lg transition-all duration-200',
        'hover:bg-white/10 hover:-translate-y-0.5 focus:ring-2 focus:ring-violet-500'
      )}
      tabIndex={0}
      aria-label={`Widget of type ${widget.type}`}
    >
      <h3 className="text-4xl font-bold text-white">{widget.type}</h3>
      {/* Render widget properties here */}
    </div>
  );
};

export { CustomizableWidgets };
export type { CustomizableWidgetsProps };
