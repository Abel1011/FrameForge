'use client';

import ImageLayer from './ImageLayer';
import TextLayer from './TextLayer';
import SpeechBubbleLayer from './SpeechBubbleLayer';

export default function LayerRenderer({ layer, isSelected, isPanelSelected, onSelect, onUpdate, onDelete }) {
  const commonProps = {
    layer,
    isSelected,
    isPanelSelected,
    onSelect,
    onUpdate,
    onDelete
  };

  switch (layer.type) {
    case 'image':
      return <ImageLayer {...commonProps} />;
    case 'text':
      return <TextLayer {...commonProps} />;
    case 'speech-bubble':
      return <SpeechBubbleLayer {...commonProps} />;
    default:
      return null;
  }
}
