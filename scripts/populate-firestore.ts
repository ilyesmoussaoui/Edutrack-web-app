
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../src/lib/firebase'; // Adjust path if your scripts folder is not at the project root

interface AcademicStructure {
  [departmentName: string]: {
    years?: {
      [yearName: string]: {
        specialities?: string[];
      };
    };
  };
}

const academicData: AcademicStructure = {
  'Computer Science': {
    years: {
      '1st Year': {
        specialities: ['Math and Info'],
      },
      '2nd Year': {
        specialities: ['Math and Info'],
      },
      '3rd Year': {
        specialities: ['Software Development', 'Cybersecurity', 'AI'],
      },
      '4th Year': {
        specialities: ['Software Development', 'Cybersecurity', 'AI'],
      },
      '5th Year': {
        specialities: ['Software Development', 'Cybersecurity', 'AI'],
      },
    },
  },
  'Medicine': {},
  'Polytechnic': {},
};

async function populateFirestore() {
  console.log('Starting Firestore population script...');

  try {
    for (const deptName in academicData) {
      if (Object.prototype.hasOwnProperty.call(academicData, deptName)) {
        console.log(`Processing Department: ${deptName}`);
        const departmentData = academicData[deptName];

        const departmentRef = await addDoc(collection(db, 'departments'), {
          name: deptName,
          createdAt: serverTimestamp(),
        });
        console.log(`Added Department: ${deptName} with ID: ${departmentRef.id}`);

        if (departmentData.years) {
          for (const yearName in departmentData.years) {
            if (Object.prototype.hasOwnProperty.call(departmentData.years, yearName)) {
              console.log(`  Processing Year: ${yearName} for Department: ${deptName}`);
              const yearData = departmentData.years[yearName];

              const yearRef = await addDoc(collection(db, 'departments', departmentRef.id, 'years'), {
                name: yearName,
                createdAt: serverTimestamp(),
              });
              console.log(`    Added Year: ${yearName} with ID: ${yearRef.id} under Department ID: ${departmentRef.id}`);

              if (yearData.specialities) {
                for (const specialityName of yearData.specialities) {
                  console.log(`    Processing Speciality: ${specialityName} for Year: ${yearName}`);
                  await addDoc(collection(db, 'departments', departmentRef.id, 'years', yearRef.id, 'specialities'), {
                    name: specialityName,
                    createdAt: serverTimestamp(),
                  });
                  console.log(`      Added Speciality: ${specialityName} under Year ID: ${yearRef.id}`);
                }
              }
            }
          }
        }
      }
    }
    console.log('Firestore population script finished successfully.');
  } catch (error) {
    console.error('Error populating Firestore:', error);
  }
}

// --- How to Execute This Script ---
// This script is designed to be run once to pre-populate your database.
//
// 1.  Ensure your Firebase project is correctly configured in `src/lib/firebase.ts`
//     and your environment variables (e.g., in a .env.local file if you use them for client-side config) are set.
//
// 2.  You'll need a way to execute this TypeScript file in a Node.js environment
//     that can access your Firebase project. The `tsx` package is convenient for this.
//     If you don't have it, you can install it as a dev dependency: `npm install --save-dev tsx`
//     or `yarn add --dev tsx`.
//
// 3.  To run the script, uncomment the line `populateFirestore();` below.
//
// 4.  Then, open your terminal in the project root and run:
//     `npx tsx scripts/populate-firestore.ts`
//
// 5.  Permissions:
//     - This script uses the Firebase client SDK. Your Firestore security rules will apply.
//     - For a one-time population, you might temporarily adjust your rules to allow writes
//       to `departments` and its subcollections by an authenticated user (or `allow write: if true;`
//       cautiously, then revert), or ensure you run this script in an environment/context where
//       an authenticated user with sufficient permissions triggers it (e.g., an admin user).
//     - If using the Firebase Admin SDK (not done here), rules would be bypassed.
//
// 6.  After running successfully, re-comment `populateFirestore();` to prevent accidental re-runs.
//     This script does not check for existing data, so running it multiple times will create duplicates.

// populateFirestore(); // Uncomment this line to enable execution

// To make it callable if you integrate this into another part of your app (e.g., an admin utility page):
// export default populateFirestore;

