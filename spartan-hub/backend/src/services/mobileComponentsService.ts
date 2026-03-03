/**
 * Mobile Components Library Service
 * Phase C: Mobile Foundation - Week 10 Day 2
 * 
 * Reusable mobile component library management
 */

import { logger } from '../utils/logger';

export type ComponentCategory = 'input' | 'display' | 'navigation' | 'feedback' | 'layout' | 'typography';
export type ComponentVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ComponentSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface Component {
  id: string;
  name: string;
  category: ComponentCategory;
  description: string;
  props: ComponentProp[];
  variants: ComponentVariant[];
  sizes: ComponentSize[];
  example: string;
  dependencies: string[];
}

export interface ComponentProp {
  name: string;
  type: string;
  required: boolean;
  default?: any;
  description: string;
}

export interface ComponentLibrary {
  id: string;
  name: string;
  version: string;
  components: Component[];
  theme: ComponentTheme;
}

export interface ComponentTheme {
  colors: Record<string, string>;
  spacing: Record<string, number>;
  typography: Record<string, any>;
  borderRadius: Record<string, number>;
  shadows: Record<string, string>;
}

/**
 * Mobile Components Library Service
 */
export class MobileComponentsService {
  private libraries: Map<string, ComponentLibrary> = new Map();
  private components: Map<string, Component> = new Map();

  constructor() {
    this.initializeDefaultComponents();
    
    logger.info('MobileComponentsService initialized', {
      context: 'mobile-components'
    });
  }

  /**
   * Initialize default components
   */
  private initializeDefaultComponents(): void {
    // Button Component
    this.createComponent({
      name: 'Button',
      category: 'input',
      description: 'Primary button component for user actions',
      props: [
        { name: 'title', type: 'string', required: true, description: 'Button label' },
        { name: 'onPress', type: '() => void', required: true, description: 'Press handler' },
        { name: 'variant', type: 'ComponentVariant', required: false, default: 'primary', description: 'Button variant' },
        { name: 'size', type: 'ComponentSize', required: false, default: 'md', description: 'Button size' },
        { name: 'disabled', type: 'boolean', required: false, default: false, description: 'Disabled state' },
        { name: 'loading', type: 'boolean', required: false, default: false, description: 'Loading state' },
        { name: 'icon', type: 'string', required: false, description: 'Icon name' }
      ],
      variants: ['primary', 'secondary', 'outline', 'ghost', 'danger'],
      sizes: ['xs', 'sm', 'md', 'lg', 'xl'],
      example: `<Button title="Click Me" onPress={handlePress} variant="primary" size="md" />`,
      dependencies: ['react-native', 'react-native-paper']
    });

    // Input Component
    this.createComponent({
      name: 'Input',
      category: 'input',
      description: 'Text input component for user data entry',
      props: [
        { name: 'label', type: 'string', required: false, description: 'Input label' },
        { name: 'value', type: 'string', required: true, description: 'Input value' },
        { name: 'onChangeText', type: '(text: string) => void', required: true, description: 'Change handler' },
        { name: 'placeholder', type: 'string', required: false, description: 'Placeholder text' },
        { name: 'error', type: 'string', required: false, description: 'Error message' },
        { name: 'secureTextEntry', type: 'boolean', required: false, default: false, description: 'Password mode' },
        { name: 'multiline', type: 'boolean', required: false, default: false, description: 'Multiline input' },
        { name: 'icon', type: 'string', required: false, description: 'Icon name' }
      ],
      variants: ['primary', 'outline'],
      sizes: ['sm', 'md', 'lg'],
      example: `<Input label="Email" value={email} onChangeText={setEmail} placeholder="Enter email" />`,
      dependencies: ['react-native', 'react-native-paper']
    });

    // Card Component
    this.createComponent({
      name: 'Card',
      category: 'display',
      description: 'Card container for grouped content',
      props: [
        { name: 'title', type: 'string', required: false, description: 'Card title' },
        { name: 'subtitle', type: 'string', required: false, description: 'Card subtitle' },
        { name: 'onPress', type: '() => void', required: false, description: 'Press handler' },
        { name: 'image', type: 'string', required: false, description: 'Card image URL' },
        { name: 'elevation', type: 'number', required: false, default: 2, description: 'Shadow elevation' }
      ],
      variants: ['primary', 'outline'],
      sizes: ['sm', 'md', 'lg'],
      example: `<Card title="Workout" subtitle="30 minutes" onPress={handlePress} />`,
      dependencies: ['react-native', 'react-native-paper']
    });

    // Badge Component
    this.createComponent({
      name: 'Badge',
      category: 'display',
      description: 'Badge component for status indicators',
      props: [
        { name: 'label', type: 'string', required: true, description: 'Badge text' },
        { name: 'variant', type: 'ComponentVariant', required: false, default: 'primary', description: 'Badge variant' },
        { name: 'size', type: 'ComponentSize', required: false, default: 'sm', description: 'Badge size' }
      ],
      variants: ['primary', 'secondary', 'outline', 'ghost', 'danger'],
      sizes: ['xs', 'sm', 'md', 'lg'],
      example: `<Badge label="New" variant="primary" size="sm" />`,
      dependencies: ['react-native', 'react-native-paper']
    });

    // Avatar Component
    this.createComponent({
      name: 'Avatar',
      category: 'display',
      description: 'Avatar component for user images',
      props: [
        { name: 'source', type: 'string', required: false, description: 'Image URL' },
        { name: 'label', type: 'string', required: false, description: 'Fallback label' },
        { name: 'size', type: 'number', required: false, default: 40, description: 'Avatar size' },
        { name: 'shape', type: '"circle" | "square"', required: false, default: 'circle', description: 'Avatar shape' }
      ],
      variants: ['primary'],
      sizes: ['sm', 'md', 'lg', 'xl'],
      example: `<Avatar source={user.avatar} label={user.name} size={40} />`,
      dependencies: ['react-native', 'react-native-paper']
    });

    // Modal Component
    this.createComponent({
      name: 'Modal',
      category: 'feedback',
      description: 'Modal dialog for overlays',
      props: [
        { name: 'visible', type: 'boolean', required: true, description: 'Modal visibility' },
        { name: 'onDismiss', type: '() => void', required: true, description: 'Dismiss handler' },
        { name: 'title', type: 'string', required: false, description: 'Modal title' },
        { name: 'children', type: 'ReactNode', required: true, description: 'Modal content' }
      ],
      variants: ['primary'],
      sizes: ['sm', 'md', 'lg'],
      example: `<Modal visible={visible} onDismiss={handleDismiss} title="Confirm"><Text>Are you sure?</Text></Modal>`,
      dependencies: ['react-native', 'react-native-paper']
    });

    // Toast Component
    this.createComponent({
      name: 'Toast',
      category: 'feedback',
      description: 'Toast notifications for brief messages',
      props: [
        { name: 'message', type: 'string', required: true, description: 'Toast message' },
        { name: 'visible', type: 'boolean', required: true, description: 'Toast visibility' },
        { name: 'onHide', type: '() => void', required: true, description: 'Hide handler' },
        { name: 'type', type: '"success" | "error" | "info" | "warning"', required: false, default: 'info', description: 'Toast type' },
        { name: 'duration', type: 'number', required: false, default: 3000, description: 'Auto-hide duration' }
      ],
      variants: ['primary', 'secondary', 'danger'],
      sizes: ['sm', 'md', 'lg'],
      example: `<Toast message="Success!" visible={visible} onHide={handleHide} type="success" />`,
      dependencies: ['react-native', 'react-native-paper']
    });

    // List Component
    this.createComponent({
      name: 'List',
      category: 'display',
      description: 'List component for displaying items',
      props: [
        { name: 'data', type: 'any[]', required: true, description: 'List data' },
        { name: 'renderItem', type: '(item: any) => ReactNode', required: true, description: 'Item renderer' },
        { name: 'keyExtractor', type: '(item: any) => string', required: true, description: 'Key extractor' },
        { name: 'onEndReached', type: '() => void', required: false, description: 'End reached handler' }
      ],
      variants: ['primary'],
      sizes: ['sm', 'md', 'lg'],
      example: `<List data={items} renderItem={renderItem} keyExtractor={keyExtractor} />`,
      dependencies: ['react-native']
    });

    // Tab Component
    this.createComponent({
      name: 'Tab',
      category: 'navigation',
      description: 'Tab navigation component',
      props: [
        { name: 'tabs', type: 'TabItem[]', required: true, description: 'Tab items' },
        { name: 'activeTab', type: 'string', required: true, description: 'Active tab ID' },
        { name: 'onChange', type: '(tabId: string) => void', required: true, description: 'Tab change handler' }
      ],
      variants: ['primary', 'secondary'],
      sizes: ['sm', 'md', 'lg'],
      example: `<Tab tabs={tabs} activeTab={activeTab} onChange={handleChange} />`,
      dependencies: ['react-native', '@react-navigation/material-top-tabs']
    });

    // ProgressBar Component
    this.createComponent({
      name: 'ProgressBar',
      category: 'feedback',
      description: 'Progress bar for indicating progress',
      props: [
        { name: 'progress', type: 'number', required: true, description: 'Progress value (0-1)' },
        { name: 'showLabel', type: 'boolean', required: false, default: false, description: 'Show percentage label' },
        { name: 'variant', type: 'ComponentVariant', required: false, default: 'primary', description: 'Progress bar variant' }
      ],
      variants: ['primary', 'secondary', 'danger'],
      sizes: ['sm', 'md', 'lg'],
      example: `<ProgressBar progress={0.75} showLabel />`,
      dependencies: ['react-native', 'react-native-paper']
    });
  }

  /**
   * Create component
   */
  createComponent(config: Omit<Component, 'id'>): Component {
    const component: Component = {
      id: `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...config
    };

    this.components.set(component.id, component);

    logger.info('Component created', {
      context: 'mobile-components',
      metadata: {
        componentId: component.id,
        name: component.name,
        category: component.category
      }
    });

    return component;
  }

  /**
   * Create component library
   */
  createLibrary(name: string, version: string = '1.0.0'): ComponentLibrary {
    const library: ComponentLibrary = {
      id: `lib_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      version,
      components: Array.from(this.components.values()),
      theme: this.createDefaultTheme()
    };

    this.libraries.set(library.id, library);

    logger.info('Component library created', {
      context: 'mobile-components',
      metadata: {
        libraryId: library.id,
        name,
        components: library.components.length
      }
    });

    return library;
  }

  /**
   * Create default theme
   */
  private createDefaultTheme(): ComponentTheme {
    return {
      colors: {
        primary: '#4F46E5',
        secondary: '#7C3AED',
        success: '#10B981',
        error: '#EF4444',
        warning: '#F59E0B',
        info: '#3B82F6',
        background: '#F9FAFB',
        surface: '#FFFFFF',
        text: '#111827',
        textSecondary: '#6B7280'
      },
      spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
        xxl: 48
      },
      typography: {
        fontFamily: 'Inter',
        fontWeight: {
          regular: '400',
          medium: '500',
          semibold: '600',
          bold: '700'
        },
        fontSize: {
          xs: 12,
          sm: 14,
          md: 16,
          lg: 18,
          xl: 20,
          xxl: 24
        }
      },
      borderRadius: {
        none: 0,
        sm: 4,
        md: 8,
        lg: 12,
        xl: 16,
        full: 9999
      },
      shadows: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }
    };
  }

  /**
   * Get component by ID
   */
  getComponent(id: string): Component | null {
    return this.components.get(id) || null;
  }

  /**
   * Get components by category
   */
  getComponentsByCategory(category: ComponentCategory): Component[] {
    return Array.from(this.components.values())
      .filter(c => c.category === category);
  }

  /**
   * Get all components
   */
  getAllComponents(): Map<string, Component> {
    return new Map(this.components);
  }

  /**
   * Get component library
   */
  getLibrary(id: string): ComponentLibrary | null {
    return this.libraries.get(id) || null;
  }

  /**
   * Generate component code
   */
  generateComponentCode(componentId: string): string {
    const component = this.getComponent(componentId);
    
    if (!component) {
      return '';
    }

    const propsInterface = component.props.map(prop => 
      `  ${prop.name}${prop.required ? '' : '?'}: ${prop.type};`
    ).join('\n');

    const code = `import React from 'react';
import { ${component.name}Props } from './types';

export const ${component.name}: React.FC<${component.name}Props> = ({
${component.props.map(prop => `  ${prop.name}${prop.default !== undefined ? ` = ${JSON.stringify(prop.default)}` : ''},`).join('\n')}
}) => {
  // Component implementation
  return (
    <View>
      {/* ${component.description} */}
    </View>
  );
};

export interface ${component.name}Props {
${propsInterface}
}
`;

    return code;
  }

  /**
   * Generate component documentation
   */
  generateComponentDocs(componentId: string): string {
    const component = this.getComponent(componentId);
    
    if (!component) {
      return '';
    }

    const propsTable = component.props.map(prop => 
      `| ${prop.name} | ${prop.type} | ${prop.required ? '✅' : '❌'} | ${prop.default !== undefined ? prop.default : '-'} | ${prop.description} |`
    ).join('\n');

    const docs = `# ${component.name}

${component.description}

## Category
${component.category}

## Props

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
${propsTable}

## Variants
${component.variants.map(v => `- ${v}`).join('\n')}

## Sizes
${component.sizes.map(s => `- ${s}`).join('\n')}

## Example

\`\`\`tsx
${component.example}
\`\`\`

## Dependencies
${component.dependencies.map(d => `- ${d}`).join('\n')}
`;

    return docs;
  }

  /**
   * Export component library
   */
  exportLibrary(id: string): Record<string, any> {
    const library = this.getLibrary(id);
    
    if (!library) {
      return {};
    }

    return {
      name: library.name,
      version: library.version,
      components: library.components.map(c => ({
        name: c.name,
        category: c.category,
        props: c.props,
        variants: c.variants,
        sizes: c.sizes
      })),
      theme: library.theme
    };
  }

  /**
   * Health check
   */
  healthCheck(): boolean {
    const componentCount = this.components.size;
    const libraryCount = this.libraries.size;
    const isHealthy = componentCount >= 10 && libraryCount >= 1;

    logger.debug('Mobile components health check', {
      context: 'mobile-components',
      metadata: {
        healthy: isHealthy,
        componentCount,
        libraryCount
      }
    });

    return isHealthy;
  }
}

// Singleton instance
const mobileComponentsService = new MobileComponentsService();

export default mobileComponentsService;
