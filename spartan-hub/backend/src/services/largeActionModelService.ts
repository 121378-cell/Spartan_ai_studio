/**
 * Large Action Model Service (LAMs)
 * 
 * Transforms AI from passive assistant to autonomous agent that takes actions.
 * LAMs generate action sequences based on user context, goals, and preferences.
 * 
 * Capabilities:
 * - Auto-schedule workouts in calendar
 * - Adjust grocery lists based on nutrition plans
 * - Book recovery services (massage, cryo, etc.)
 * - Reorder supplements when running low
 * - Adapt training plans based on real-time data
 * 
 * Based on strategic roadmap Phase 5: Intelligence Layer
 */

import { logger } from '../utils/logger';
import { ValidationError } from '../utils/errorHandler';

export interface ActionSequence {
  id: string;
  userId: string;
  trigger: ActionTrigger;
  actions: Action[];
  status: 'pending' | 'approved' | 'executing' | 'completed' | 'failed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: Date;
  approvedAt?: Date;
  completedAt?: Date;
  requiresApproval: boolean;
  userApproved: boolean;
  metadata: {
    estimatedImpact: string;
    reason: string;
    alternativeActions?: string[];
  };
}

export interface ActionTrigger {
  type: 'biometric_alert' | 'schedule_conflict' | 'goal_milestone' | 'supplement_low' | 'recovery_needed' | 'user_request' | 'predictive';
  source: string;
  data: Record<string, any>;
  timestamp: Date;
}

export interface Action {
  id: string;
  type: ActionType;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'skipped';
  params: Record<string, any>;
  result?: ActionResult;
  dependsOn?: string[]; // Action IDs this action depends on
  retryCount: number;
  maxRetries: number;
}

export type ActionType = 
  | 'schedule_workout'
  | 'reschedule_workout'
  | 'cancel_workout'
  | 'add_grocery_item'
  | 'remove_grocery_item'
  | 'book_recovery_service'
  | 'order_supplement'
  | 'adjust_training_plan'
  | 'send_notification'
  | 'update_sleep_schedule'
  | 'request_biometric_sync'
  | 'initiate_rest_day';

export interface ActionResult {
  success: boolean;
  message: string;
  data?: Record<string, any>;
  error?: string;
  executedAt: Date;
}

export interface UserContext {
  userId: string;
  currentGoals: string[];
  trainingPlan: {
    currentPhase: string;
    weeklySchedule: string[];
    nextWorkout?: {
      date: Date;
      type: string;
      duration: number;
    };
  };
  biometrics: {
    readiness: number;
    hrv: number;
    sleepQuality: number;
    stressLevel: number;
    lastUpdated: Date;
  };
  calendar: {
    busySlots: Array<{ start: Date; end: Date }>;
    preferredWorkoutTimes: string[];
  };
  nutrition: {
    currentPlan: string;
    calorieTarget: number;
    macroTargets: { protein: number; carbs: number; fats: number };
    groceryList: string[];
  };
  preferences: {
    autoApproveLowImpact: boolean;
    autoApproveSameDay: boolean;
    requireApprovalFor: ActionType[];
    maxAutoBookingCost: number;
  };
  supplements: {
    inventory: Record<string, { quantity: number; daysRemaining: number }>;
    reorderThreshold: number; // days
  };
}

export class LargeActionModelService {
  private actionSequences: Map<string, ActionSequence> = new Map();
  private readonly MAX_SEQUENCE_AGE_DAYS = 7;

  /**
   * Analyze context and generate action sequence
   */
  async generateActionSequence(
    userId: string,
    trigger: ActionTrigger,
    context: UserContext
  ): Promise<ActionSequence> {
    try {
      logger.info('Generating action sequence', {
        context: 'large-action-model',
        metadata: { userId, triggerType: trigger.type }
      });

      // Analyze context and determine appropriate actions
      const actions = await this.determineActions(trigger, context);
      
      if (actions.length === 0) {
        logger.info('No actions required for trigger', {
          context: 'large-action-model',
          metadata: { userId, trigger }
        });
        return null as any;
      }

      // Determine if approval is required
      const requiresApproval = this.requiresUserApproval(actions, context);

      const sequence: ActionSequence = {
        id: this.generateSequenceId(),
        userId,
        trigger,
        actions,
        status: requiresApproval ? 'pending' : 'approved',
        priority: this.calculatePriority(actions, context),
        createdAt: new Date(),
        requiresApproval,
        userApproved: !requiresApproval,
        metadata: {
          estimatedImpact: this.calculateImpact(actions),
          reason: this.generateReason(actions, trigger),
          alternativeActions: this.generateAlternatives(actions, context)
        }
      };

      this.actionSequences.set(sequence.id, sequence);

      logger.info('Action sequence generated', {
        context: 'large-action-model',
        metadata: {
          sequenceId: sequence.id,
          actionCount: actions.length,
          requiresApproval
        }
      });

      // If no approval required, execute immediately
      if (!requiresApproval) {
        await this.executeSequence(sequence.id);
      }

      return sequence;
    } catch (error) {
      logger.error('Failed to generate action sequence', {
        context: 'large-action-model',
        metadata: { userId, trigger, error }
      });
      throw error;
    }
  }

  /**
   * Determine appropriate actions based on trigger and context
   */
  private async determineActions(
    trigger: ActionTrigger,
    context: UserContext
  ): Promise<Action[]> {
    const actions: Action[] = [];

    switch (trigger.type) {
      case 'biometric_alert':
        actions.push(...this.handleBiometricAlert(trigger, context));
        break;

      case 'schedule_conflict':
        actions.push(...this.handleScheduleConflict(trigger, context));
        break;

      case 'goal_milestone':
        actions.push(...this.handleGoalMilestone(trigger, context));
        break;

      case 'supplement_low':
        actions.push(...this.handleSupplementLow(trigger, context));
        break;

      case 'recovery_needed':
        actions.push(...this.handleRecoveryNeeded(trigger, context));
        break;

      case 'predictive':
        actions.push(...this.handlePredictiveAction(trigger, context));
        break;

      case 'user_request':
        actions.push(...this.handleUserRequest(trigger, context));
        break;
    }

    // Add dependencies between actions
    return this.addActionDependencies(actions);
  }

  /**
   * Handle biometric alert (low HRV, poor sleep, etc.)
   */
  private handleBiometricAlert(trigger: ActionTrigger, context: UserContext): Action[] {
    const actions: Action[] = [];
    const { metric, value, severity } = trigger.data;

    if (metric === 'readiness' && value < 40) {
      // Very low readiness - adjust training
      actions.push({
        id: this.generateActionId(),
        type: 'adjust_training_plan',
        status: 'pending',
        params: {
          adjustment: 'reduce_intensity',
          reason: `Readiness score ${value} - reducing load to prevent overtraining`,
          newPlan: 'recovery_focus'
        },
        retryCount: 0,
        maxRetries: 3
      });

      actions.push({
        id: this.generateActionId(),
        type: 'initiate_rest_day',
        status: 'pending',
        params: {
          date: new Date(),
          reason: 'Low readiness - prioritizing recovery'
        },
        retryCount: 0,
        maxRetries: 3
      });

      actions.push({
        id: this.generateActionId(),
        type: 'book_recovery_service',
        status: 'pending',
        params: {
          service: 'massage',
          urgency: 'high',
          reason: 'Readiness below 40%'
        },
        retryCount: 0,
        maxRetries: 3
      });
    }

    if (metric === 'sleep_quality' && value < 50) {
      actions.push({
        id: this.generateActionId(),
        type: 'update_sleep_schedule',
        status: 'pending',
        params: {
          newBedtime: '22:30',
          sleepHygiene: [
            'No screens 1h before bed',
            'Room temperature 65-68°F',
            'Consistent wake time'
          ],
          reason: 'Poor sleep quality detected'
        },
        retryCount: 0,
        maxRetries: 3
      });

      actions.push({
        id: this.generateActionId(),
        type: 'add_grocery_item',
        status: 'pending',
        params: {
          items: ['magnesium_glycinate', 'melatonin_3mg', 'chamomile_tea'],
          reason: 'Sleep support supplements'
        },
        retryCount: 0,
        maxRetries: 3
      });
    }

    return actions;
  }

  /**
   * Handle schedule conflicts
   */
  private handleScheduleConflict(trigger: ActionTrigger, context: UserContext): Action[] {
    const actions: Action[] = [];
    const { conflictingEvent, workoutDate } = trigger.data;

    // Find next available slot
    const nextSlot = this.findNextAvailableSlot(context);

    actions.push({
      id: this.generateActionId(),
      type: 'reschedule_workout',
      status: 'pending',
      params: {
        originalDate: workoutDate,
        newDate: nextSlot,
        reason: `Conflict with: ${conflictingEvent}`,
        notifyUser: true
      },
      retryCount: 0,
      maxRetries: 3
    });

    return actions;
  }

  /**
   * Handle goal milestone achievements
   */
  private handleGoalMilestone(trigger: ActionTrigger, context: UserContext): Action[] {
    const actions: Action[] = [];
    const { milestone, goal } = trigger.data;

    // Celebrate and adjust plan
    actions.push({
      id: this.generateActionId(),
      type: 'send_notification',
      status: 'pending',
      params: {
        type: 'celebration',
        title: '🎉 Goal Milestone Reached!',
        body: `You've achieved: ${milestone}`,
        actions: ['view_progress', 'share_achievement']
      },
      retryCount: 0,
      maxRetries: 3
    });

    // If goal completed, generate next milestone
    if (trigger.data.isGoalComplete) {
      actions.push({
        id: this.generateActionId(),
        type: 'adjust_training_plan',
        status: 'pending',
        params: {
          adjustment: 'progress_to_next_phase',
          reason: `Goal "${goal}" completed - progressing to next level`,
          celebration: true
        },
        retryCount: 0,
        maxRetries: 3
      });
    }

    return actions;
  }

  /**
   * Handle low supplement inventory
   */
  private handleSupplementLow(trigger: ActionTrigger, context: UserContext): Action[] {
    const actions: Action[] = [];
    const { supplement, daysRemaining } = trigger.data;

    actions.push({
      id: this.generateActionId(),
      type: 'order_supplement',
      status: 'pending',
      params: {
        supplement,
        quantity: 30, // 30-day supply
        urgency: daysRemaining < 3 ? 'high' : 'normal',
        autoOrder: context.preferences.autoApproveLowImpact && daysRemaining > 3,
        reason: `${supplement} running low (${daysRemaining} days remaining)`
      },
      retryCount: 0,
      maxRetries: 3
    });

    return actions;
  }

  /**
   * Handle recovery needs
   */
  private handleRecoveryNeeded(trigger: ActionTrigger, context: UserContext): Action[] {
    const actions: Action[] = [];
    const { recoveryType, urgency } = trigger.data;

    if (recoveryType === 'deep_tissue' && urgency === 'high') {
      actions.push({
        id: this.generateActionId(),
        type: 'book_recovery_service',
        status: 'pending',
        params: {
          service: 'deep_tissue_massage',
          urgency: 'high',
          preferredTime: context.calendar.preferredWorkoutTimes[0],
          reason: 'High training load - deep recovery needed'
        },
        retryCount: 0,
        maxRetries: 3
      });
    }

    actions.push({
      id: this.generateActionId(),
      type: 'add_grocery_item',
      status: 'pending',
      params: {
        items: ['tart_cherries', 'turmeric', 'omega3_supplement'],
        reason: 'Anti-inflammatory foods for recovery'
      },
      retryCount: 0,
      maxRetries: 3
    });

    return actions;
  }

  /**
   * Handle predictive actions
   */
  private handlePredictiveAction(trigger: ActionTrigger, context: UserContext): Action[] {
    const actions: Action[] = [];
    const { prediction, confidence } = trigger.data;

    if (prediction === 'overtraining_risk' && confidence > 0.8) {
      actions.push({
        id: this.generateActionId(),
        type: 'adjust_training_plan',
        status: 'pending',
        params: {
          adjustment: 'deload_week',
          reason: 'ML model predicts 85% overtraining risk in next 7 days',
          confidence: confidence
        },
        retryCount: 0,
        maxRetries: 3
      });
    }

    if (prediction === 'missed_workout_likely' && confidence > 0.7) {
      actions.push({
        id: this.generateActionId(),
        type: 'reschedule_workout',
        status: 'pending',
        params: {
          originalDate: new Date(),
          newDate: this.findNextAvailableSlot(context),
          reason: 'Predicted schedule conflict - proactively rescheduling',
          confidence: confidence
        },
        retryCount: 0,
        maxRetries: 3
      });
    }

    return actions;
  }

  /**
   * Handle explicit user requests
   */
  private handleUserRequest(trigger: ActionTrigger, context: UserContext): Action[] {
    const actions: Action[] = [];
    const { request, intent } = trigger.data;

    if (intent === 'schedule_workout') {
      const { date, type } = trigger.data;
      actions.push({
        id: this.generateActionId(),
        type: 'schedule_workout',
        status: 'pending',
        params: {
          date,
          type,
          duration: 60,
          source: 'user_request'
        },
        retryCount: 0,
        maxRetries: 3
      });
    }

    if (intent === 'add_to_shopping_list') {
      const { items } = trigger.data;
      actions.push({
        id: this.generateActionId(),
        type: 'add_grocery_item',
        status: 'pending',
        params: {
          items,
          source: 'user_request'
        },
        retryCount: 0,
        maxRetries: 3
      });
    }

    return actions;
  }

  /**
   * Execute action sequence
   */
  async executeSequence(sequenceId: string): Promise<ActionSequence> {
    const sequence = this.actionSequences.get(sequenceId);
    if (!sequence) {
      throw new ValidationError('Action sequence not found');
    }

    if (sequence.status !== 'approved') {
      throw new ValidationError('Sequence not approved for execution');
    }

    sequence.status = 'executing';

    logger.info('Executing action sequence', {
      context: 'large-action-model',
      metadata: {
        sequenceId,
        actionCount: sequence.actions.length
      }
    });

    // Execute actions in order, respecting dependencies
    for (const action of sequence.actions) {
      if (action.status === 'pending') {
        // Check if dependencies are met
        if (action.dependsOn) {
          const depsMet = action.dependsOn.every(depId => {
            const dep = sequence.actions.find(a => a.id === depId);
            return dep?.status === 'completed';
          });

          if (!depsMet) {
            action.status = 'pending';
            continue;
          }
        }

        await this.executeAction(action, sequence.userId);
      }
    }

    // Update sequence status
    const allCompleted = sequence.actions.every(a => 
      a.status === 'completed' || a.status === 'skipped'
    );
    const anyFailed = sequence.actions.some(a => a.status === 'failed');

    sequence.status = anyFailed ? 'failed' : allCompleted ? 'completed' : 'executing';
    sequence.completedAt = allCompleted ? new Date() : undefined;

    logger.info('Action sequence execution completed', {
      context: 'large-action-model',
      metadata: {
        sequenceId,
        status: sequence.status,
        completedActions: sequence.actions.filter(a => a.status === 'completed').length
      }
    });

    return sequence;
  }

  /**
   * Execute single action
   */
  private async executeAction(action: Action, userId: string): Promise<void> {
    try {
      action.status = 'executing';

      logger.info('Executing action', {
        context: 'large-action-model',
        metadata: {
          actionId: action.id,
          actionType: action.type,
          userId
        }
      });

      // Route to appropriate executor
      let result: ActionResult;

      switch (action.type) {
        case 'schedule_workout':
        case 'reschedule_workout':
        case 'cancel_workout':
          result = await this.executeCalendarAction(action, userId);
          break;

        case 'add_grocery_item':
        case 'remove_grocery_item':
          result = await this.executeShoppingAction(action, userId);
          break;

        case 'book_recovery_service':
          result = await this.executeBookingAction(action, userId);
          break;

        case 'order_supplement':
          result = await this.executeOrderAction(action, userId);
          break;

        case 'adjust_training_plan':
          result = await this.executeTrainingAction(action, userId);
          break;

        case 'send_notification':
          result = await this.executeNotificationAction(action, userId);
          break;

        case 'update_sleep_schedule':
          result = await this.executeSleepAction(action, userId);
          break;

        case 'request_biometric_sync':
          result = await this.executeSyncAction(action, userId);
          break;

        case 'initiate_rest_day':
          result = await this.executeRestAction(action, userId);
          break;

        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      action.result = result;
      action.status = result.success ? 'completed' : 'failed';

      logger.info('Action execution completed', {
        context: 'large-action-model',
        metadata: {
          actionId: action.id,
          success: result.success
        }
      });

    } catch (error) {
      action.status = 'failed';
      action.result = {
        success: false,
        message: 'Execution failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        executedAt: new Date()
      };

      // Retry logic
      if (action.retryCount < action.maxRetries) {
        action.retryCount++;
        action.status = 'pending';
        logger.warn('Action failed, will retry', {
          context: 'large-action-model',
          metadata: {
            actionId: action.id,
            retryCount: action.retryCount
          }
        });
      }
    }
  }

  /**
   * Approve action sequence (user approval)
   */
  async approveSequence(sequenceId: string, userApproved: boolean): Promise<ActionSequence> {
    const sequence = this.actionSequences.get(sequenceId);
    if (!sequence) {
      throw new ValidationError('Action sequence not found');
    }

    if (sequence.status !== 'pending') {
      throw new ValidationError('Sequence is not pending approval');
    }

    sequence.userApproved = userApproved;
    sequence.approvedAt = new Date();
    sequence.status = userApproved ? 'approved' : 'cancelled';

    logger.info('Action sequence approval updated', {
      context: 'large-action-model',
      metadata: {
        sequenceId,
        userApproved
      }
    });

    if (userApproved) {
      // Execute immediately after approval
      await this.executeSequence(sequenceId);
    }

    return sequence;
  }

  /**
   * Get sequence by ID
   */
  getSequence(sequenceId: string): ActionSequence | undefined {
    return this.actionSequences.get(sequenceId);
  }

  /**
   * Get pending sequences for user
   */
  getPendingSequences(userId: string): ActionSequence[] {
    return Array.from(this.actionSequences.values())
      .filter(s => s.userId === userId && s.status === 'pending')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Private helper methods

  private requiresUserApproval(actions: Action[], context: UserContext): boolean {
    // Check if any action requires explicit approval
    const highImpactActions = [
      'book_recovery_service',
      'order_supplement',
      'cancel_workout'
    ];

    const hasHighImpact = actions.some(a => highImpactActions.includes(a.type));
    
    if (hasHighImpact) return true;

    // Check user preferences
    const requiresExplicit = actions.some(a => 
      context.preferences.requireApprovalFor.includes(a.type)
    );

    if (requiresExplicit) return true;

    // Auto-approve if low impact and matches preferences
    if (context.preferences.autoApproveLowImpact) {
      return false;
    }

    return true;
  }

  private calculatePriority(actions: Action[], context: UserContext): 'low' | 'medium' | 'high' | 'urgent' {
    const hasUrgent = actions.some(a => 
      a.type === 'initiate_rest_day' || 
      (a.type === 'adjust_training_plan' && a.params.adjustment === 'deload_week')
    );

    if (hasUrgent) return 'urgent';

    const hasHigh = actions.some(a => 
      a.type === 'book_recovery_service' || a.type === 'reschedule_workout'
    );

    if (hasHigh) return 'high';

    const hasMedium = actions.some(a => 
      a.type === 'order_supplement' || a.type === 'add_grocery_item'
    );

    if (hasMedium) return 'medium';

    return 'low';
  }

  private calculateImpact(actions: Action[]): string {
    const impactTypes = actions.map(a => a.type);
    
    if (impactTypes.includes('adjust_training_plan')) {
      return 'High - modifies training schedule';
    }
    if (impactTypes.includes('book_recovery_service')) {
      return 'Medium - schedules external service';
    }
    if (impactTypes.includes('order_supplement')) {
      return 'Low - automatic reorder';
    }
    return 'Low - informational actions';
  }

  private generateReason(actions: Action[], trigger: ActionTrigger): string {
    const actionNames = actions.map(a => a.type.replace(/_/g, ' ')).join(', ');
    return `Triggered by ${trigger.type}: ${trigger.source}. Actions: ${actionNames}`;
  }

  private generateAlternatives(actions: Action[], context: UserContext): string[] {
    const alternatives: string[] = [];

    if (actions.some(a => a.type === 'reschedule_workout')) {
      alternatives.push('Keep original time and shorten workout to 30 min');
      alternatives.push('Move to home workout instead of gym');
    }

    if (actions.some(a => a.type === 'book_recovery_service')) {
      alternatives.push('Use self-massage tools at home');
      alternatives.push('Schedule for next week instead');
    }

    return alternatives;
  }

  private addActionDependencies(actions: Action[]): Action[] {
    // Add logical dependencies between actions
    const rescheduleIndex = actions.findIndex(a => a.type === 'reschedule_workout');
    const scheduleIndex = actions.findIndex(a => a.type === 'schedule_workout');

    if (rescheduleIndex !== -1 && scheduleIndex !== -1) {
      actions[rescheduleIndex].dependsOn = [actions[scheduleIndex].id];
    }

    return actions;
  }

  private findNextAvailableSlot(context: UserContext): Date {
    // Simple implementation - in production would check actual calendar
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(18, 0, 0, 0);
    return tomorrow;
  }

  // Action executors (placeholders - would integrate with real services)
  private async executeCalendarAction(action: Action, userId: string): Promise<ActionResult> {
    // Integrate with calendar API (Google, Apple, Outlook)
    return {
      success: true,
      message: `Calendar action ${action.type} executed`,
      data: { calendarEventId: `cal_${Date.now()}` },
      executedAt: new Date()
    };
  }

  private async executeShoppingAction(action: Action, userId: string): Promise<ActionResult> {
    // Integrate with shopping list service
    return {
      success: true,
      message: `Shopping list updated: ${action.params.items?.length || 0} items`,
      executedAt: new Date()
    };
  }

  private async executeBookingAction(action: Action, userId: string): Promise<ActionResult> {
    // Integrate with booking service (Mindbody, ClassPass, etc.)
    return {
      success: true,
      message: `Recovery service booked: ${action.params.service}`,
      data: { bookingId: `book_${Date.now()}` },
      executedAt: new Date()
    };
  }

  private async executeOrderAction(action: Action, userId: string): Promise<ActionResult> {
    // Integrate with e-commerce (Amazon, supplement stores)
    return {
      success: true,
      message: `Supplement order placed: ${action.params.supplement}`,
      data: { orderId: `ord_${Date.now()}` },
      executedAt: new Date()
    };
  }

  private async executeTrainingAction(action: Action, userId: string): Promise<ActionResult> {
    // Integrate with training plan service
    return {
      success: true,
      message: `Training plan adjusted: ${action.params.adjustment}`,
      executedAt: new Date()
    };
  }

  private async executeNotificationAction(action: Action, userId: string): Promise<ActionResult> {
    // Integrate with notification service
    return {
      success: true,
      message: `Notification sent: ${action.params.title}`,
      executedAt: new Date()
    };
  }

  private async executeSleepAction(action: Action, userId: string): Promise<ActionResult> {
    // Integrate with sleep tracking
    return {
      success: true,
      message: `Sleep schedule updated: ${action.params.newBedtime}`,
      executedAt: new Date()
    };
  }

  private async executeSyncAction(action: Action, userId: string): Promise<ActionResult> {
    // Request biometric sync
    return {
      success: true,
      message: 'Biometric sync requested',
      executedAt: new Date()
    };
  }

  private async executeRestAction(action: Action, userId: string): Promise<ActionResult> {
    // Mark rest day
    return {
      success: true,
      message: `Rest day initiated for ${action.params.date}`,
      executedAt: new Date()
    };
  }

  private generateSequenceId(): string {
    return `lam_seq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
export const largeActionModelService = new LargeActionModelService();
