import type { Requirement } from './types';

export type CustomerApplicationRequirement = Pick<
  Requirement,
  | 'key'
  | 'name'
  | 'question'
  | 'description'
  | 'type'
  | 'required'
  | 'options'
  | 'customerLabel'
  | 'sortOrder'
>;

export const customerApplicationRequirements: CustomerApplicationRequirement[] =
  [
    {
      key: 'date_of_birth',
      name: 'Date of birth',
      question: 'What is your date of birth?',
      description: '',
      type: 'date',
      required: true,
      options: [],
      customerLabel: 'Date of birth',
      sortOrder: 10,
    },
    {
      key: 'residence_type',
      name: 'Residence type',
      question: 'What type of home is this delivery for?',
      description: '',
      type: 'single_select',
      required: true,
      options: ['House', 'Apartment / townhome / condo'],
      customerLabel: 'Residence type',
      sortOrder: 20,
    },
    {
      key: 'property_name',
      name: 'Property name',
      question: 'What is the apartment or property name?',
      description: 'Required unless the delivery address is a house.',
      type: 'text',
      required: false,
      options: [],
      customerLabel: 'Property name',
      sortOrder: 30,
    },
    {
      key: 'unit_number',
      name: 'Unit number',
      question: 'What is the unit or apartment number?',
      description: 'Required unless the delivery address is a house.',
      type: 'text',
      required: false,
      options: [],
      customerLabel: 'Unit / apartment',
      sortOrder: 40,
    },
    {
      key: 'rental_package',
      name: 'Rental package',
      question: 'Select a rental package',
      description:
        'Standalone washer and dryer units. Stackable units are not offered.',
      type: 'single_select',
      required: true,
      options: ['Washer & Dryer Set'],
      customerLabel: 'Rental package',
      sortOrder: 50,
    },
    {
      key: 'delivery_date',
      name: 'Delivery date',
      question: 'Choose your preferred delivery date',
      description: 'We will confirm availability before scheduling.',
      type: 'date',
      required: true,
      options: [],
      customerLabel: 'Preferred delivery date',
      sortOrder: 60,
    },
    {
      key: 'delivery_time_slot',
      name: 'Delivery time slot',
      question: 'Choose a preferred time slot',
      description: 'Optional. Final timing is confirmed after approval.',
      type: 'single_select',
      required: false,
      options: ['Morning (8 AM - 12 PM)', 'Afternoon (12 PM - 5 PM)'],
      customerLabel: 'Preferred time slot',
      sortOrder: 70,
    },
    {
      key: 'additional_notes',
      name: 'Additional notes',
      question: 'Anything else we should know?',
      description: 'Optional delivery, access, or rental details.',
      type: 'text',
      required: false,
      options: [],
      customerLabel: 'Additional notes',
      sortOrder: 80,
    },
  ];

export const customerApplicationKeys = new Set(
  customerApplicationRequirements.map((requirement) => requirement.key),
);

export const customerApplicationLabels = Object.fromEntries(
  customerApplicationRequirements.map((requirement) => [
    requirement.key,
    requirement.customerLabel || requirement.name,
  ]),
) as Record<string, string>;
