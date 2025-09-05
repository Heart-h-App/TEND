import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteExperiment() {
  try {
    // List all experiments first
    const experiments = await prisma.experiment.findMany({
      select: { id: true, ownerEmail: true, challenge: true, createdAt: true }
    });
    
    console.log('Current experiments:');
    experiments.forEach((exp, index) => {
      console.log(`${index + 1}. ID: ${exp.id}`);
      console.log(`   Email: ${exp.ownerEmail}`);
      console.log(`   Challenge: ${exp.challenge.substring(0, 50)}...`);
      console.log(`   Created: ${exp.createdAt}`);
      console.log('');
    });

    // Replace 'EXPERIMENT_ID_HERE' with the actual ID you want to delete
    const experimentId = 'cmf4lpnxg00008oogu62zlh9x';
    
    if (experimentId === 'EXPERIMENT_ID_HERE') {
      console.log('Please replace EXPERIMENT_ID_HERE with the actual experiment ID you want to delete');
      return;
    }

    const deleted = await prisma.experiment.delete({
      where: { id: experimentId }
    });
    
    console.log('Deleted experiment:', deleted);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteExperiment();
