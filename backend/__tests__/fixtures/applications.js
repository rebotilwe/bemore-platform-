export const validApplication = {
  userType: 'developer',
  personal: {
    firstName: 'John',
    surname: 'Doe',
    email: 'john.doe@example.com',
    phone: '+27721234567',
    companyName: 'Doe Developments',
  },
  formData: {
    projectName: 'Test Project',
    projectValue: 50000000,
    projectType: 'residential',
    location: 'Johannesburg',
    description: 'A test project',
  },
};

export const validLandowner = {
  userType: 'landowner',
  personal: {
    firstName: 'Jane',
    surname: 'Smith',
    email: 'jane.smith@example.com',
    phone: '+27821234567',
  },
  formData: {
    landSize: 'Greater than 5,000 sqm',
    zoningStatus: 'Commercial',
    isServiced: 'Yes',
    landStatus: 'Land Secured',
    projectStage: 'Funding Stage',
    estimatedValue: 'R20m – R100m',
  },
};

export const invalidApplication = {
  userType: 'developer',
  personal: {
    firstName: '',
    surname: 'Doe',
    email: 'not-an-email',
    phone: '',
  },
};

export const duplicateEmailApplication = {
  userType: 'developer',
  personal: {
    firstName: 'Another',
    surname: 'User',
    email: 'john.doe@example.com',
    phone: '+27729999999',
  },
};

export const adminCredentials = {
  email: 'admin@bemore.co.za',
  password: 'BeMore@2026!',
};

export const invalidCredentials = {
  email: 'admin@bemore.co.za',
  password: 'wrongpassword',
};
