/**
 * Distributed Tracing Service
 * Implements OpenTelemetry-based distributed tracing for the Spartan Hub application
 */

import opentelemetry, { Span, Tracer, SpanStatusCode, AttributeValue, Attributes, TimeInput, SpanStatus } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import * as resources from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { logger } from './logger';

export class TracingService {
  private static instance: TracingService;
  private sdk: NodeSDK | null = null;
  private tracer: Tracer | null = null;
  private readonly serviceName: string = 'spartan-hub-backend';
  private readonly traceExporterUrl: string = process.env.OTLP_EXPORTER_URL || 'http://jaeger:4318/v1/traces';

  private constructor() { }

  static getInstance(): TracingService {
    if (!TracingService.instance) {
      TracingService.instance = new TracingService();
    }
    return TracingService.instance;
  }

  /**
   * Initialize the tracing service
   */
  async initialize(): Promise<void> {
    try {
      // Configure the OpenTelemetry SDK
      this.sdk = new NodeSDK({
        resource: new (resources as any).Resource({
          [SemanticResourceAttributes.SERVICE_NAME]: this.serviceName,
          [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
        }),
        traceExporter: new OTLPTraceExporter({
          url: this.traceExporterUrl,
        }),
        instrumentations: [getNodeAutoInstrumentations()],
      });

      // Initialize the SDK
      await this.sdk.start();

      // Create a tracer instance
      this.tracer = opentelemetry.trace.getTracer(
        this.serviceName,
        process.env.npm_package_version || '1.0.0'
      );

      logger.info('Distributed tracing initialized', {
        context: 'tracing',
        metadata: {
          serviceName: this.serviceName,
          exporterUrl: this.traceExporterUrl
        }
      });
    } catch (error) {
      logger.error('Failed to initialize tracing service', {
        context: 'tracing',
        metadata: {
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }

  /**
   * Get the tracer instance
   */
  getTracer(): Tracer | null {
    return this.tracer;
  }

  /**
   * Create a new span with the given name and attributes
   */
  startSpan(spanName: string, attributes?: Record<string, string | number | boolean>): Span | null {
    if (!this.tracer) {
      return null;
    }

    return this.tracer.startSpan(spanName, {
      attributes
    });
  }

  /**
   * Execute a function within a span context
   */
  async executeWithSpan<T>(
    spanName: string,
    fn: (span: Span) => Promise<T>,
    attributes?: Record<string, string | number | boolean>
  ): Promise<T> {
    if (!this.tracer) {
      return await fn(nullSpan); // Use a no-op span
    }

    const span = this.tracer.startSpan(spanName, { attributes });
    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error)
      });
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Shutdown the tracing service
   */
  async shutdown(): Promise<void> {
    if (this.sdk) {
      await this.sdk.shutdown();
      logger.info('Tracing service shut down', { context: 'tracing' });
    }
  }

  /**
   * Add attributes to the current active span
   */
  addAttributes(attributes: Record<string, string | number | boolean>): void {
    const currentSpan = opentelemetry.trace.getActiveSpan();
    if (currentSpan) {
      currentSpan.setAttributes(attributes);
    }
  }

  /**
   * Add event to the current active span
   */
  addEvent(name: string, attributes?: Record<string, string | number | boolean>): void {
    const currentSpan = opentelemetry.trace.getActiveSpan();
    if (currentSpan) {
      currentSpan.addEvent(name, attributes);
    }
  }
}

// Create a no-op span for when tracing is not available
const nullSpan: Span = {
  end: () => { },
  setAttribute (key: string, value: AttributeValue) { return this; },
  setAttributes (attributes: Attributes) { return this; },
  addEvent (name: string, attributesOrStartTime?: Attributes | TimeInput, startTime?: TimeInput) { return this; },
  setStatus (status: SpanStatus) { return this; },
  updateName (name: string) { return this; },
  addLink () { return this; },
  addLinks () { return this; },
  recordException () { return this; },
  isRecording: () => false,
  spanContext: () => ({
    traceId: '00000000000000000000000000000000',
    spanId: '0000000000000000',
    traceFlags: 0
  })
};

// Export singleton instance
export const tracingService = TracingService.getInstance();