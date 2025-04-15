import React, { useState, useEffect } from 'react';
import Joyride, { CallBackProps, Step } from 'react-joyride';

// Joyride status constants, since Status isn't directly exported
const STATUS = {
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused',
  FINISHED: 'finished',
  SKIPPED: 'skipped',
  ERROR: 'error'
};

type TourKey = 'main' | 'documents' | 'properties' | 'maintenance';

// Store tour completion state in local storage
const getTourCompleted = (tourKey: TourKey): boolean => {
  try {
    const completed = localStorage.getItem(`tour-${tourKey}-completed`);
    return completed === 'true';
  } catch (e) {
    return false;
  }
};

const setTourCompleted = (tourKey: TourKey, completed: boolean): void => {
  try {
    localStorage.setItem(`tour-${tourKey}-completed`, String(completed));
  } catch (e) {
    console.error('Failed to save tour state to localStorage', e);
  }
};

// Predefined tours for different sections of the app
const tours: Record<TourKey, Step[]> = {
  main: [
    {
      target: 'body',
      content: 'Welcome to the ARIBIA LLC Management Portal! Let\'s take a quick tour to help you get started.',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '[data-tour="sidebar"]',
      content: 'This is the main navigation. You can access different sections of the app from here.',
      placement: 'right',
    },
    {
      target: '[data-tour="user-menu"]',
      content: 'Click here to access your profile settings and log out.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="dashboard-summary"]',
      content: 'This dashboard gives you an overview of your properties and important metrics.',
      placement: 'bottom',
    },
  ],
  documents: [
    {
      target: 'body',
      content: 'Welcome to the Document Management system! This is where you can organize and access all your case files.',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '[data-tour="document-search"]',
      content: 'Search for specific documents using keywords, categories, or dates.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="document-upload"]',
      content: 'Click here to upload new documents to the system.',
      placement: 'left',
    },
    {
      target: '[data-tour="document-organize"]',
      content: 'Organize your documents into categories for easier access.',
      placement: 'left',
    },
    {
      target: '[data-tour="document-tabs"]',
      content: 'Switch between different views to see your documents organized in different ways.',
      placement: 'top',
    },
  ],
  properties: [
    {
      target: 'body',
      content: 'Welcome to the Properties section! Here you can manage all your real estate properties.',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '[data-tour="property-list"]',
      content: 'View all properties in your portfolio.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="property-add"]',
      content: 'Add new properties to your portfolio.',
      placement: 'left',
    },
  ],
  maintenance: [
    {
      target: 'body',
      content: 'This is the Maintenance Management area where you can track and manage maintenance requests.',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '[data-tour="maintenance-list"]',
      content: 'View all maintenance requests for your properties.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="maintenance-add"]',
      content: 'Create new maintenance requests.',
      placement: 'left',
    },
  ],
};

interface UseOnboardingProps {
  tourKey: TourKey;
  autoStart?: boolean;
  stepIndex?: number;
}

export function useOnboarding({ 
  tourKey, 
  autoStart = false, 
  stepIndex = 0
}: UseOnboardingProps) {
  const [run, setRun] = useState(false);
  const [tourSteps] = useState<Step[]>(tours[tourKey] || []);
  const [stepCount, setStepCount] = useState(stepIndex);
  const [completed, setCompleted] = useState(getTourCompleted(tourKey));

  useEffect(() => {
    // Auto start the tour if it hasn't been completed yet
    if (autoStart && !completed && tourSteps.length > 0) {
      const timer = setTimeout(() => {
        setRun(true);
      }, 1000); // Delay the start of the tour to allow the page to render

      return () => clearTimeout(timer);
    }
  }, [autoStart, completed, tourSteps]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, index } = data;
    
    // Update the current step
    setStepCount(index);

    // Handle tour completion
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRun(false);
      setTourCompleted(tourKey, true);
      setCompleted(true);
    }
  };

  const startTour = () => {
    setCompleted(false);
    setTourCompleted(tourKey, false);
    setStepCount(0);
    setRun(true);
  };

  const stopTour = () => {
    setRun(false);
  };

  const resetTourCompletion = () => {
    setCompleted(false);
    setTourCompleted(tourKey, false);
  };

  return {
    run,
    steps: tourSteps,
    stepIndex: stepCount,
    tourCompleted: completed,
    handleJoyrideCallback,
    startTour,
    stopTour,
    resetTourCompletion
  };
}

interface OnboardingTourProps {
  tourKey: TourKey;
  autoStart?: boolean;
  stepIndex?: number;
  children?: React.ReactNode;
}

export function OnboardingTour({ 
  tourKey, 
  autoStart = false, 
  stepIndex = 0,
  children 
}: OnboardingTourProps) {
  const { 
    run, 
    steps, 
    handleJoyrideCallback,
    tourCompleted,
    startTour
  } = useOnboarding({ tourKey, autoStart, stepIndex });

  return (
    <>
      <Joyride
        callback={handleJoyrideCallback}
        continuous
        hideCloseButton
        run={run}
        scrollToFirstStep
        showProgress
        showSkipButton
        steps={steps}
        styles={{
          options: {
            zIndex: 10000,
            primaryColor: 'var(--primary)',
            backgroundColor: 'var(--background)',
            textColor: 'var(--foreground)',
            arrowColor: 'var(--background)',
          },
          tooltipContainer: {
            textAlign: 'left',
          },
          buttonNext: {
            backgroundColor: 'var(--primary)',
          },
          buttonBack: {
            marginRight: 10,
          },
        }}
      />
      {children}
    </>
  );
}

// Default export for the hook
export default useOnboarding;